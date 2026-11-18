"use server";

import { desc, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { assertPermission } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { renderHtml, type Doc } from "@/lib/editor/render";
import { sanitize, mediaResolverFor } from "@/server/content/derive";

const Input = z.object({ id: z.uuid(), title: z.string().trim().min(1).max(120), seoDescription: z.string().trim().max(320).nullable(), contentJson: z.object({ type: z.literal("doc"), content: z.array(z.any()).optional() }) });

export async function savePage(input: z.input<typeof Input>) {
  const user = await assertPermission("page.manage");
  const d = Input.parse(input);
  const page = await db.query.pages.findFirst({ where: eq(schema.pages.id, d.id) });
  if (!page) return { ok: false, error: "Page not found." };
  const doc = d.contentJson as Doc;
  const html = sanitize(renderHtml(doc, { resolveMedia: await mediaResolverFor(doc) }));
  // Saving a legal template means the owner has reviewed it, so the "template" badge goes.
  await db.update(schema.pages).set({ title: d.title, seoDescription: d.seoDescription, contentJson: doc, html, isTemplate: false, updatedById: user.id }).where(eq(schema.pages.id, d.id));
  await db.insert(schema.pageRevisions).values({ pageId: d.id, title: d.title, contentJson: doc, authorId: user.id });
  await audit(user, "page.update", `Edited the page “${d.title}”`, { type: "page", id: d.id });
  updateTag("pages");
  updateTag(`page:${page.slug}`);
  return { ok: true };
}

export async function restorePageRevision(revisionId: string) {
  const user = await assertPermission("page.manage");
  const rev = await db.query.pageRevisions.findFirst({ where: eq(schema.pageRevisions.id, z.uuid().parse(revisionId)) });
  if (!rev) return { ok: false };
  return savePage({ id: rev.pageId, title: rev.title, seoDescription: null, contentJson: rev.contentJson as Doc }).then(async (r) => {
    await audit(user, "page.restore", `Restored an earlier version of “${rev.title}”`, { type: "page", id: rev.pageId });
    return r;
  });
}

export async function pageRevisions(pageId: string) {
  await assertPermission("page.manage");
  return db.select({ id: schema.pageRevisions.id, title: schema.pageRevisions.title, createdAt: schema.pageRevisions.createdAt }).from(schema.pageRevisions).where(eq(schema.pageRevisions.pageId, z.uuid().parse(pageId))).orderBy(desc(schema.pageRevisions.createdAt)).limit(30);
}
