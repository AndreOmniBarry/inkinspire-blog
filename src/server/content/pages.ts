import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";

export async function getPage(slug: string) {
  "use cache";
  cacheTag("pages", `page:${slug}`);
  cacheLife("days");
  const p = await db.query.pages.findFirst({
    where: eq(schema.pages.slug, slug),
    columns: { slug: true, title: true, kind: true, html: true, seoDescription: true, isTemplate: true, updatedAt: true },
  });
  return p ?? null;
}

export async function getLegalSlugs() {
  "use cache";
  cacheTag("pages");
  cacheLife("days");
  return db.select({ slug: schema.pages.slug, updatedAt: schema.pages.updatedAt }).from(schema.pages).where(eq(schema.pages.kind, "legal"));
}
