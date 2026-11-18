import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { mediaSources } from "@/server/media/url";
import { can } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import type { EditorPost } from "@/components/editor/editor";
import type { EditorOptions } from "@/components/editor/settings-panel";
import type { Doc } from "@/lib/editor/render";
import { getSiteSettings } from "@/server/settings";
import { env } from "@/server/env";

export async function loadEditor(user: SessionUser, id: string): Promise<{ post: EditorPost; options: EditorOptions } | null> {
  const post = await db.query.posts.findFirst({ where: eq(schema.posts.id, id) });
  if (!post) return null;
  const own = post.createdById === user.id;
  if (!(can(user.role, "post.edit.any") || (own && can(user.role, "post.edit.own")))) return null;
  const [cover, authorRows, tagRows, categories, collections, authors, recent, settings] = await Promise.all([
    post.coverMediaId ? db.query.media.findFirst({ where: eq(schema.media.id, post.coverMediaId) }) : Promise.resolve(undefined),
    db.select({ id: schema.postAuthors.authorId }).from(schema.postAuthors).where(eq(schema.postAuthors.postId, id)).orderBy(asc(schema.postAuthors.position)),
    db.select({ name: schema.tags.name }).from(schema.postTags).innerJoin(schema.tags, eq(schema.tags.id, schema.postTags.tagId)).where(eq(schema.postTags.postId, id)),
    db.select({ id: schema.categories.id, name: schema.categories.name }).from(schema.categories).orderBy(asc(schema.categories.position)),
    db.select({ id: schema.collections.id, name: schema.collections.name }).from(schema.collections).orderBy(asc(schema.collections.name)),
    db.select({ id: schema.authors.id, name: schema.authors.name }).from(schema.authors).orderBy(asc(schema.authors.name)),
    db.select().from(schema.media).orderBy(desc(schema.media.createdAt)).limit(15),
    getSiteSettings(),
  ]);
  return {
    post: {
      id: post.id,
      status: post.status,
      contentJson: post.contentJson as Doc,
      cover: cover ? { id: cover.id, alt: cover.alt, ...mediaSources(cover) } : null,
      scheduledAt: post.scheduledAt?.toISOString() ?? null,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      updatedAt: post.updatedAt.toISOString(),
      reviewNote: post.reviewNote,
      meta: {
        title: post.title,
        subtitle: post.subtitle,
        slug: post.title ? post.slug : "",
        excerpt: post.excerpt,
        visibility: post.visibility,
        categoryId: post.categoryId,
        collectionId: post.collectionId,
        coverMediaId: post.coverMediaId,
        authorIds: authorRows.map((a) => a.id),
        tags: tagRows.map((t) => t.name),
        featured: post.featured,
        commentsEnabled: post.commentsEnabled,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
      },
    },
    options: {
      categories,
      collections,
      authors,
      recentMedia: recent.map((m) => ({ id: m.id, alt: m.alt, ...mediaSources(m) })),
      canPublish: can(user.role, "post.publish"),
      siteUrl: env.SITE_URL,
      siteName: settings.identity.name,
    },
  };
}
