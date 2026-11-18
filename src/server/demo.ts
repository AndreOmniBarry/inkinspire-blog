import "server-only";
import { eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { getStorage } from "@/server/media/storage";

/**
 * Removes everything labelled as demo content: stories (and their revisions, tags links, reactions,
 * bookmarks via cascade), demo collections, demo media files, tags left unused. Categories, the
 * owner's author profile, pages, settings and accounts are kept.
 */
export async function removeDemoContent() {
  const demoPosts = await db.select({ id: schema.posts.id }).from(schema.posts).where(eq(schema.posts.isDemo, true));
  const demoMedia = await db.select().from(schema.media).where(eq(schema.media.isDemo, true));
  await db.transaction(async (tx) => {
    if (demoPosts.length) await tx.delete(schema.posts).where(inArray(schema.posts.id, demoPosts.map((p) => p.id)));
    await tx.delete(schema.collections).where(eq(schema.collections.isDemo, true));
    await tx.execute(sql`delete from tags where id not in (select tag_id from post_tags)`);
    if (demoMedia.length) await tx.delete(schema.media).where(inArray(schema.media.id, demoMedia.map((m) => m.id)));
    await tx.update(schema.homepageSlots).set({ postIds: [] });
  });
  const storage = getStorage();
  for (const m of demoMedia) {
    for (const k of [m.key, ...Object.values(m.variants).flatMap((v) => Object.values(v))]) await storage.remove(k).catch(() => {});
  }
  return { stories: demoPosts.length, media: demoMedia.length };
}
