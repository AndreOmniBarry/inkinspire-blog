"use server";

import { desc, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { assertPermission } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";

/** Command-palette search across stories, pages and readers (only what the role may see). */
export async function studioSearch(q: string) {
  const user = await assertPermission("studio.access");
  const term = `%${q.trim().slice(0, 80)}%`;
  if (q.trim().length < 2) return { stories: [], pages: [], readers: [] };
  const [stories, pages, readers] = await Promise.all([
    can(user.role, "post.create")
      ? db
          .select({ id: schema.posts.id, title: schema.posts.title, status: schema.posts.status })
          .from(schema.posts)
          .where(or(ilike(schema.posts.title, term), ilike(schema.posts.slug, term)))
          .orderBy(desc(schema.posts.updatedAt))
          .limit(8)
      : [],
    can(user.role, "page.manage")
      ? db.select({ id: schema.pages.id, title: schema.pages.title, slug: schema.pages.slug }).from(schema.pages).where(ilike(schema.pages.title, term)).limit(5)
      : [],
    can(user.role, "reader.view")
      ? db
          .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
          .from(schema.users)
          .where(or(ilike(schema.users.name, term), sql`${schema.users.email} ilike ${term}`))
          .limit(5)
      : [],
  ]);
  return { stories, pages, readers };
}
