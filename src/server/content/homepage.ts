import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { asc } from "drizzle-orm";
import { db, schema } from "@/server/db";

export type HomepageSection = {
  section: (typeof schema.homepageSectionEnum.enumValues)[number];
  heading: string | null;
  postIds: string[];
};

/** The owner's curated homepage: section order, on/off, headings and hand-picked stories. */
export async function getHomepageLayout(): Promise<HomepageSection[]> {
  "use cache";
  cacheTag("homepage");
  cacheLife("days");
  const rows = await db.select().from(schema.homepageSlots).orderBy(asc(schema.homepageSlots.position));
  return rows.filter((r) => r.enabled).map((r) => ({ section: r.section, heading: r.heading, postIds: r.postIds }));
}
