"use server";

import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { assertPermission, type SessionUser } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { deriveContent, excerptFrom } from "@/server/content/derive";
import { transition, type Action } from "@/server/content/workflow";
import { audit } from "@/server/audit";
import { slugify } from "@/lib/slug";
import type { Doc } from "@/lib/editor/render";

const { posts, postRevisions, postAuthors, postTags, tags, authors } = schema;

function revalidatePublic(slugs: Array<string | null | undefined>) {
  updateTag("posts");
  updateTag("homepage");
  for (const s of slugs) if (s) updateTag(`post:${s}`);
}

async function loadEditable(user: SessionUser, postId: string) {
  const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
  if (!post) throw new Error("This story no longer exists.");
  const own = post.createdById === user.id;
  if (!(can(user.role, "post.edit.any") || (own && can(user.role, "post.edit.own")))) throw new Error("You don’t have permission to edit this story.");
  // Authors cannot edit once a story is scheduled or published; an editor must send it back first.
  if (!can(user.role, "post.edit.any") && !["draft", "pending_review"].includes(post.status)) {
    throw new Error("This story is with the editor. Ask them to send it back if you need to make changes.");
  }
  return { post, own };
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "untitled";
  let slug = root;
  for (let i = 2; i < 200; i++) {
    const clash = await db.query.posts.findFirst({ where: excludeId ? and(eq(posts.slug, slug), ne(posts.id, excludeId)) : eq(posts.slug, slug), columns: { id: true } });
    if (!clash) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function createStory() {
  const user = await assertPermission("post.create");
  const slug = await uniqueSlug(`untitled-${Date.now().toString(36)}`);
  const [post] = await db
    .insert(posts)
    .values({ title: "", slug, status: "draft", createdById: user.id, updatedById: user.id })
    .returning({ id: posts.id });
  // The writer's own author profile, if they have one; otherwise the first author.
  const author =
    (await db.query.authors.findFirst({ where: eq(authors.userId, user.id) })) ?? (await db.query.authors.findFirst({ orderBy: (a, { asc }) => asc(a.createdAt) }));
  if (author) await db.insert(postAuthors).values({ postId: post.id, authorId: author.id });
  await audit(user, "post.create", "Started a new story", { type: "post", id: post.id });
  redirect(`/studio/write/${post.id}`);
}

const Meta = z.object({
  title: z.string().max(200),
  subtitle: z.string().max(300).nullable(),
  slug: z.string().max(120),
  excerpt: z.string().max(400).nullable(),
  visibility: z.enum(["free", "premium"]),
  categoryId: z.uuid().nullable(),
  collectionId: z.uuid().nullable(),
  coverMediaId: z.uuid().nullable(),
  authorIds: z.array(z.uuid()).max(5),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
  featured: z.boolean(),
  commentsEnabled: z.boolean(),
  seoTitle: z.string().max(120).nullable(),
  seoDescription: z.string().max(320).nullable(),
});

const SaveInput = z.object({
  postId: z.uuid(),
  contentJson: z.object({ type: z.literal("doc"), content: z.array(z.any()).optional() }),
  meta: Meta,
  /** The updatedAt the editor last saw; used to detect edits from another device. */
  baseUpdatedAt: z.string().nullable(),
  reason: z.enum(["autosave", "manual"]).default("autosave"),
});

export type SaveResult = { ok: true; updatedAt: string; slug: string; wordCount: number; readingMinutes: number } | { ok: false; error: string; conflict?: boolean };

/** Autosave (every few seconds while writing) and manual save. Keeps a revision every few minutes. */
export async function saveStory(input: z.input<typeof SaveInput>): Promise<SaveResult> {
  try {
    const user = await assertPermission("post.create");
    const data = SaveInput.parse(input);
    const { post } = await loadEditable(user, data.postId);
    if (data.baseUpdatedAt && new Date(data.baseUpdatedAt).getTime() + 1000 < post.updatedAt.getTime() && post.updatedById !== user.id) {
      return { ok: false, conflict: true, error: "Someone else changed this story since you opened it. Reload to see their version." };
    }
    const doc = data.contentJson as Doc;
    const m = data.meta;
    const derived = await deriveContent(doc, m.visibility);
    const slug = m.slug.trim() ? await uniqueSlug(m.slug, post.id) : post.title ? post.slug : await uniqueSlug(m.title || post.slug, post.id);
    // Slugs of live stories don't change silently: keep the old URL working until the owner edits it deliberately.
    const finalSlug = post.status === "published" && slug !== post.slug && !m.slug.trim() ? post.slug : slug;
    const [row] = await db
      .update(posts)
      .set({
        title: m.title.trim(),
        subtitle: m.subtitle?.trim() || null,
        slug: finalSlug,
        excerpt: m.excerpt?.trim() || null,
        visibility: m.visibility,
        contentJson: doc,
        ...derived,
        categoryId: m.categoryId,
        collectionId: m.collectionId,
        coverMediaId: m.coverMediaId,
        featured: can(user.role, "post.publish") ? m.featured : post.featured,
        commentsEnabled: m.commentsEnabled,
        seoTitle: m.seoTitle?.trim() || null,
        seoDescription: m.seoDescription?.trim() || null,
        updatedById: user.id,
      })
      .where(eq(posts.id, post.id))
      .returning({ updatedAt: posts.updatedAt });

    // Authors and tags
    if (m.authorIds.length) {
      await db.delete(postAuthors).where(eq(postAuthors.postId, post.id));
      await db.insert(postAuthors).values(m.authorIds.map((authorId, position) => ({ postId: post.id, authorId, position })));
    }
    await db.delete(postTags).where(eq(postTags.postId, post.id));
    for (const name of [...new Set(m.tags.map((t) => t.toLowerCase()))]) {
      const slugT = slugify(name);
      if (!slugT) continue;
      const [tag] = await db.insert(tags).values({ slug: slugT, name }).onConflictDoUpdate({ target: tags.slug, set: { slug: slugT } }).returning();
      await db.insert(postTags).values({ postId: post.id, tagId: tag.id }).onConflictDoNothing();
    }

    // Revision: always on manual save; on autosave at most every 3 minutes.
    const last = await db.query.postRevisions.findFirst({ where: eq(postRevisions.postId, post.id), orderBy: desc(postRevisions.createdAt) });
    if (data.reason === "manual" || !last || Date.now() - last.createdAt.getTime() > 3 * 60_000) {
      await db.insert(postRevisions).values({ postId: post.id, title: m.title, contentJson: doc, wordCount: derived.wordCount, reason: data.reason, authorId: user.id });
    }
    if (["published", "scheduled", "archived"].includes(post.status)) revalidatePublic([post.slug, finalSlug]);
    return { ok: true, updatedAt: row.updatedAt.toISOString(), slug: finalSlug, wordCount: derived.wordCount, readingMinutes: derived.readingMinutes };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save." };
  }
}

const WorkflowInput = z.object({
  postId: z.uuid(),
  action: z.enum(["save_draft", "submit", "request_changes", "schedule", "publish", "unpublish", "archive", "restore"]),
  scheduledAt: z.string().nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
});

export async function runWorkflow(input: z.input<typeof WorkflowInput>): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  try {
    const user = await assertPermission("post.create");
    const data = WorkflowInput.parse(input);
    const post = await db.query.posts.findFirst({ where: eq(posts.id, data.postId) });
    if (!post) return { ok: false, error: "This story no longer exists." };
    const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    const t = transition({ from: post.status, action: data.action as Action, role: user.role, isOwnPost: post.createdById === user.id, scheduledAt });
    if (!t.ok) return { ok: false, error: t.reason };
    if ((data.action === "publish" || data.action === "schedule") && !post.title.trim()) return { ok: false, error: "Give the story a title before publishing." };
    if (data.action === "submit" && !post.title.trim()) return { ok: false, error: "Give the story a title before submitting it." };
    await db
      .update(posts)
      .set({
        status: t.to,
        scheduledAt: data.action === "schedule" ? scheduledAt : t.clearSchedule ? null : post.scheduledAt,
        publishedAt: t.setPublishedAt ? (post.publishedAt ?? new Date()) : post.publishedAt,
        archivedAt: t.to === "archived" ? new Date() : null,
        reviewNote: data.action === "request_changes" ? (data.note ?? null) : data.action === "submit" ? null : post.reviewNote,
        updatedById: user.id,
        // A story without a hand-written excerpt gets one from its public preview.
        excerpt: post.excerpt ?? (t.to === "published" || t.to === "scheduled" ? excerptFrom(post.searchText) || null : null),
      })
      .where(eq(posts.id, post.id));
    if (t.to === "published" && data.action === "publish") {
      await db.insert(postRevisions).values({ postId: post.id, title: post.title, contentJson: post.contentJson, wordCount: post.wordCount, reason: "publish", authorId: user.id });
    }
    const words: Record<string, string> = {
      submit: "Submitted for review",
      request_changes: "Sent back for changes",
      schedule: `Scheduled for ${scheduledAt?.toISOString()}`,
      publish: "Published",
      unpublish: "Unpublished",
      archive: "Archived",
      restore: "Restored from archive",
      save_draft: "Saved",
    };
    await audit(user, `post.${data.action}`, `${words[data.action]}: “${post.title}”`, { type: "post", id: post.id }, data.note ? { note: data.note } : undefined);
    revalidatePublic([post.slug]);
    return { ok: true, status: t.to };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteStory(postId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await assertPermission("post.delete");
  const post = await db.query.posts.findFirst({ where: eq(posts.id, z.uuid().parse(postId)) });
  if (!post) return { ok: true };
  await db.delete(posts).where(eq(posts.id, post.id));
  await audit(user, "post.delete", `Deleted “${post.title || "Untitled"}”`, { type: "post", id: post.id }, { slug: post.slug });
  revalidatePublic([post.slug]);
  return { ok: true };
}

export async function setFlags(postIds: string[], patch: { featured?: boolean; visibility?: "free" | "premium" }) {
  const user = await assertPermission("post.publish");
  const ids = z.array(z.uuid()).max(200).parse(postIds);
  if (!ids.length) return { ok: true };
  if (patch.visibility) {
    // Visibility changes what is public, so re-derive each story's preview and search text.
    const rows = await db.select().from(posts).where(inArray(posts.id, ids));
    for (const p of rows) {
      const d = await deriveContent(p.contentJson as Doc, patch.visibility);
      await db.update(posts).set({ visibility: patch.visibility, ...d, updatedById: user.id }).where(eq(posts.id, p.id));
    }
  }
  if (patch.featured !== undefined) await db.update(posts).set({ featured: patch.featured }).where(inArray(posts.id, ids));
  await audit(user, "post.bulk_update", `Updated ${ids.length} stor${ids.length === 1 ? "y" : "ies"}`, undefined, { ids, patch });
  const slugs = await db.select({ slug: posts.slug }).from(posts).where(inArray(posts.id, ids));
  revalidatePublic(slugs.map((s) => s.slug));
  return { ok: true };
}

export async function bulkWorkflow(postIds: string[], action: "archive" | "unpublish" | "delete") {
  const ids = z.array(z.uuid()).max(200).parse(postIds);
  const results: string[] = [];
  for (const id of ids) {
    if (action === "delete") {
      const r = await deleteStory(id);
      if (!r.ok) results.push(r.error ?? "error");
    } else {
      const r = await runWorkflow({ postId: id, action });
      if (!r.ok) results.push(r.error);
    }
  }
  return { ok: results.length === 0, errors: results };
}

export async function restoreRevision(revisionId: string) {
  const user = await assertPermission("post.create");
  const rev = await db.query.postRevisions.findFirst({ where: eq(postRevisions.id, z.uuid().parse(revisionId)) });
  if (!rev) throw new Error("Revision not found.");
  const { post } = await loadEditable(user, rev.postId);
  // Snapshot the current text first, so a restore can itself be undone.
  await db.insert(postRevisions).values({ postId: post.id, title: post.title, contentJson: post.contentJson, wordCount: post.wordCount, reason: "manual", authorId: user.id });
  const d = await deriveContent(rev.contentJson as Doc, post.visibility);
  await db.update(posts).set({ title: rev.title, contentJson: rev.contentJson, ...d, updatedById: user.id }).where(eq(posts.id, post.id));
  await db.insert(postRevisions).values({ postId: post.id, title: rev.title, contentJson: rev.contentJson, wordCount: d.wordCount, reason: "restore", authorId: user.id });
  await audit(user, "post.restore_revision", `Restored an earlier version of “${post.title}”`, { type: "post", id: post.id });
  revalidatePublic([post.slug]);
  return { ok: true };
}

export async function listRevisions(postId: string) {
  const user = await assertPermission("post.create");
  await loadEditable(user, z.uuid().parse(postId)).catch(() => {
    throw new Error("Not allowed");
  });
  return db
    .select({ id: postRevisions.id, title: postRevisions.title, reason: postRevisions.reason, wordCount: postRevisions.wordCount, createdAt: postRevisions.createdAt, author: schema.users.name, contentJson: postRevisions.contentJson })
    .from(postRevisions)
    .leftJoin(schema.users, eq(schema.users.id, postRevisions.authorId))
    .where(eq(postRevisions.postId, postId))
    .orderBy(desc(postRevisions.createdAt))
    .limit(40);
}

/** Pre-publish link check: which links in the story don't answer? (Warns; never blocks.) */
export async function checkLinks(urls: string[]): Promise<Array<{ url: string; ok: boolean }>> {
  await assertPermission("post.create");
  // Public web addresses only: never let the server be pointed at internal hosts (SSRF).
  const isPublic = (u: string) => {
    try {
      const h = new URL(u).hostname.toLowerCase();
      return !(
        h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^\[|::1/.test(h) ||
        /^(127|10|0)\./.test(h) || /^169\.254\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^\d+$/.test(h)
      );
    } catch {
      return false;
    }
  };
  const list = z.array(z.string().url()).max(30).parse(urls.filter((u) => /^https?:/.test(u) && isPublic(u)));
  return Promise.all(
    list.map(async (url) => {
      try {
        const ctrl = AbortSignal.timeout(5000);
        let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctrl });
        if (res.status === 405 || res.status === 403) res = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(5000) });
        return { url, ok: res.status < 400 };
      } catch {
        return { url, ok: false };
      }
    }),
  );
}

export async function suggestSlug(title: string) {
  await assertPermission("post.create");
  return slugify(title);
}

