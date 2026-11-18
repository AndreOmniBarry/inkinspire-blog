import { asc, desc, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { StudioHeader, StudioSection } from "@/components/studio/page-header";
import { HomepageEditor } from "@/components/studio/homepage-editor";

export const metadata = { title: "Homepage" };

export default async function HomepageStudioPage() {
  await requireStaff("homepage.manage");
  const [slots, stories] = await Promise.all([
    db.select().from(schema.homepageSlots).orderBy(asc(schema.homepageSlots.position)),
    db
      .select({ id: schema.posts.id, title: schema.posts.title, featured: schema.posts.featured })
      .from(schema.posts)
      .where(sql`${schema.posts.status} = 'published' or (${schema.posts.status} = 'scheduled' and ${schema.posts.scheduledAt} <= now())`)
      .orderBy(desc(schema.posts.publishedAt))
      .limit(200),
  ]);
  return (
    <>
      <StudioHeader title="Homepage" description="Choose what readers see first: the featured story, your picks, and the order of every section." />
      <StudioSection>
        <HomepageEditor initial={slots.map((s) => ({ id: s.id, section: s.section, enabled: s.enabled, heading: s.heading, postIds: s.postIds }))} stories={stories} />
      </StudioSection>
    </>
  );
}
