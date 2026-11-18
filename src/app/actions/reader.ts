"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { getSessionUser } from "@/server/auth/session";
import { rateLimit } from "@/server/security/rate-limit";

const PostId = z.uuid();

export type ReaderState = { signedIn: boolean; bookmarked: boolean; appreciated: boolean; appreciations: number; progress: number };

/** Per-reader state for a story, fetched by the client after load so pages stay cacheable. */
export async function getReaderState(postId: string): Promise<ReaderState> {
  const id = PostId.parse(postId);
  const user = await getSessionUser();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.reactions).where(eq(schema.reactions.postId, id));
  if (!user) return { signedIn: false, bookmarked: false, appreciated: false, appreciations: n, progress: 0 };
  const [b, r, h] = await Promise.all([
    db.query.bookmarks.findFirst({ where: and(eq(schema.bookmarks.userId, user.id), eq(schema.bookmarks.postId, id)) }),
    db.query.reactions.findFirst({ where: and(eq(schema.reactions.userId, user.id), eq(schema.reactions.postId, id)) }),
    db.query.readingHistory.findFirst({ where: and(eq(schema.readingHistory.userId, user.id), eq(schema.readingHistory.postId, id)) }),
  ]);
  return { signedIn: true, bookmarked: !!b, appreciated: !!r, appreciations: n, progress: h?.completedAt ? 0 : (h?.progress ?? 0) };
}

export async function toggleBookmark(postId: string): Promise<{ ok: boolean; bookmarked?: boolean; reason?: "signed_out" }> {
  const id = PostId.parse(postId);
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "signed_out" };
  if (!(await rateLimit(`bookmark:${user.id}`, 60, 60))) return { ok: false };
  const where = and(eq(schema.bookmarks.userId, user.id), eq(schema.bookmarks.postId, id));
  const existing = await db.query.bookmarks.findFirst({ where });
  if (existing) {
    await db.delete(schema.bookmarks).where(where);
    return { ok: true, bookmarked: false };
  }
  await db.insert(schema.bookmarks).values({ userId: user.id, postId: id }).onConflictDoNothing();
  return { ok: true, bookmarked: true };
}

/** One appreciation per reader per story (primary key enforces it). Tapping again takes it back. */
export async function toggleAppreciation(postId: string): Promise<{ ok: boolean; appreciated?: boolean; reason?: "signed_out" }> {
  const id = PostId.parse(postId);
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "signed_out" };
  if (!(await rateLimit(`appreciate:${user.id}`, 60, 60))) return { ok: false };
  const where = and(eq(schema.reactions.userId, user.id), eq(schema.reactions.postId, id), eq(schema.reactions.kind, "appreciate"));
  const existing = await db.query.reactions.findFirst({ where });
  if (existing) {
    await db.delete(schema.reactions).where(where);
    return { ok: true, appreciated: false };
  }
  await db.insert(schema.reactions).values({ userId: user.id, postId: id, kind: "appreciate" }).onConflictDoNothing();
  return { ok: true, appreciated: true };
}

/** Records reading progress for "resume where you left off" and reading history. */
export async function recordProgress(postId: string, progress: number): Promise<void> {
  const id = PostId.parse(postId);
  const p = Math.max(0, Math.min(100, Math.round(progress)));
  const user = await getSessionUser();
  if (!user) return;
  await db
    .insert(schema.readingHistory)
    .values({ userId: user.id, postId: id, progress: p, completedAt: p >= 95 ? new Date() : null })
    .onConflictDoUpdate({
      target: [schema.readingHistory.userId, schema.readingHistory.postId],
      set: {
        progress: sql`greatest(${schema.readingHistory.progress}, ${p})`,
        lastReadAt: new Date(),
        completedAt: p >= 95 ? sql`coalesce(${schema.readingHistory.completedAt}, now())` : sql`${schema.readingHistory.completedAt}`,
      },
    });
}
