import { desc, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { mediaSources } from "@/server/media/url";
import { StudioHeader, StudioSection } from "@/components/studio/page-header";
import { MediaLibrary } from "@/components/studio/media-library";

export const metadata = { title: "Media" };

export default async function MediaPage() {
  await requireStaff("media.upload");
  const rows = await db
    .select({
      m: schema.media,
      uses: sql<number>`((select count(*) from posts where cover_media_id = "media"."id") + (select count(*) from posts where content_json::text like '%' || "media"."id"::text || '%') + (select count(*) from authors where photo_media_id = "media"."id"))::int`,
    })
    .from(schema.media)
    .orderBy(desc(schema.media.createdAt))
    .limit(300);
  return (
    <>
      <StudioHeader title="Media" description="Every image you’ve uploaded. Each one is optimised automatically, stripped of location data, and must have alt text." />
      <StudioSection>
        <MediaLibrary items={rows.map(({ m, uses }) => ({ id: m.id, src: mediaSources(m).src, alt: m.alt, caption: m.caption, credit: m.credit, filename: m.filename, width: m.width, height: m.height, bytes: m.bytes, focalX: m.focalX, focalY: m.focalY, uses, createdAt: m.createdAt.toISOString() }))} />
      </StudioSection>
    </>
  );
}
