import { asc, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { mediaSources } from "@/server/media/url";
import { StudioHeader, StudioSection } from "@/components/studio/page-header";
import { AuthorsUI } from "@/components/studio/authors-ui";

export const metadata = { title: "Authors" };

export default async function AuthorsStudio() {
  await requireStaff("author.manage");
  const [rows, recent] = await Promise.all([
    db.select({ a: schema.authors, photo: schema.media, storyCount: sql<number>`(select count(*)::int from post_authors where post_authors.author_id = "authors"."id")` }).from(schema.authors).leftJoin(schema.media, eq(schema.media.id, schema.authors.photoMediaId)).orderBy(asc(schema.authors.name)),
    db.select().from(schema.media).orderBy(desc(schema.media.createdAt)).limit(15),
  ]);
  return (
    <>
      <StudioHeader title="Authors" description="The people whose names appear on stories: photos, biographies and links." />
      <StudioSection>
        <AuthorsUI
          authors={rows.map(({ a, photo, storyCount }) => ({ id: a.id, name: a.name, slug: a.slug, tagline: a.tagline, bio: a.bio, socials: a.socials as Record<string, string>, isGuest: a.isGuest, storyCount, photo: photo ? { id: photo.id, alt: photo.alt, ...mediaSources(photo) } : null }))}
          recent={recent.map((m) => ({ id: m.id, alt: m.alt, ...mediaSources(m) }))}
        />
      </StudioSection>
    </>
  );
}
