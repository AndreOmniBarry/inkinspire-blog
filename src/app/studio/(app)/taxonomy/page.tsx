import { asc, desc, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { StudioHeader, StudioSection } from "@/components/studio/page-header";
import { CategoryManager, CollectionManager, TagManager } from "@/components/studio/taxonomy-ui";

export const metadata = { title: "Themes & tags" };

export default async function TaxonomyPage() {
  await requireStaff("taxonomy.manage");
  const [cats, tags, colls] = await Promise.all([
    db.select({ id: schema.categories.id, name: schema.categories.name, slug: schema.categories.slug, description: schema.categories.description, colour: schema.categories.colour, seoTitle: schema.categories.seoTitle, seoDescription: schema.categories.seoDescription, count: sql<number>`(select count(*)::int from posts where posts.category_id = "categories"."id")` }).from(schema.categories).orderBy(asc(schema.categories.position)),
    db.select({ id: schema.tags.id, name: schema.tags.name, count: sql<number>`(select count(*)::int from post_tags where post_tags.tag_id = "tags"."id")` }).from(schema.tags).orderBy(desc(sql`3`), asc(schema.tags.name)),
    db.select({ id: schema.collections.id, name: schema.collections.name, description: schema.collections.description, count: sql<number>`(select count(*)::int from posts where posts.collection_id = "collections"."id")` }).from(schema.collections).orderBy(asc(schema.collections.name)),
  ]);
  return (
    <>
      <StudioHeader title="Themes, series and tags" description="How stories are organised on the site. Themes appear in the menu and footer; series group stories in order; tags are finer labels." />
      <StudioSection title="Themes"><CategoryManager categories={cats} /></StudioSection>
      <StudioSection title="Series"><CollectionManager collections={colls} /></StudioSection>
      <StudioSection title="Tags"><TagManager tags={tags} /></StudioSection>
    </>
  );
}
