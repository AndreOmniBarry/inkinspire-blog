import "server-only";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/server/db";
import type { SessionUser } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";

const { posts, categories, users } = schema;
export const LIBRARY_PAGE = 30;

export async function getLibrary(user: SessionUser, q: { status?: string; search?: string; category?: string; page?: number }) {
  const where: SQL[] = [];
  if (!can(user.role, "post.edit.any")) where.push(eq(posts.createdById, user.id));
  if (q.status && ["draft", "pending_review", "scheduled", "published", "archived"].includes(q.status)) where.push(eq(posts.status, q.status as never));
  if (q.category) where.push(eq(posts.categoryId, q.category));
  if (q.search) where.push(or(ilike(posts.title, `%${q.search}%`), ilike(posts.slug, `%${q.search}%`))!);
  const page = Math.max(1, q.page ?? 1);
  const scope = can(user.role, "post.edit.any") ? undefined : eq(posts.createdById, user.id);
  const [rows, [{ total }], counts] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        status: posts.status,
        visibility: posts.visibility,
        featured: posts.featured,
        wordCount: posts.wordCount,
        updatedAt: posts.updatedAt,
        publishedAt: posts.publishedAt,
        scheduledAt: posts.scheduledAt,
        isDemo: posts.isDemo,
        category: categories.name,
        author: users.name,
      })
      .from(posts)
      .leftJoin(categories, eq(categories.id, posts.categoryId))
      .leftJoin(users, eq(users.id, posts.createdById))
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(posts.updatedAt))
      .limit(LIBRARY_PAGE)
      .offset((page - 1) * LIBRARY_PAGE),
    db.select({ total: count() }).from(posts).where(where.length ? and(...where) : undefined),
    db.select({ status: posts.status, n: sql<number>`count(*)::int` }).from(posts).where(scope).groupBy(posts.status),
  ]);
  const cats = await db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(categories.position);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / LIBRARY_PAGE)), counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) as Record<string, number>, categories: cats };
}
