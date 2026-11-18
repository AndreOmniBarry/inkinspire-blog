import "server-only";
import { and, eq, lte, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db, schema } from "@/server/db";
import { drainOutbox } from "@/server/email/outbox";

/**
 * The minute job. Every step is idempotent, so running it twice, late, or not at all for a while is
 * safe. Scheduled stories are already visible at their time without it (ADR-005); this only tidies.
 */
export async function runTick() {
  const started = Date.now();
  // 1. Finalise scheduled stories whose time has come.
  const due = await db
    .update(schema.posts)
    .set({ status: "published", publishedAt: sql`coalesce(${schema.posts.publishedAt}, ${schema.posts.scheduledAt})` })
    .where(and(eq(schema.posts.status, "scheduled"), lte(schema.posts.scheduledAt, sql`now()`)))
    .returning({ id: schema.posts.id, slug: schema.posts.slug, title: schema.posts.title });
  if (due.length) {
    revalidateTag("posts", { expire: 0 });
    revalidateTag("homepage", { expire: 0 });
    for (const p of due) revalidateTag(`post:${p.slug}`, { expire: 0 });
    await db.insert(schema.auditLog).values(due.map((p) => ({ actorLabel: "system", action: "post.scheduled_published", summary: `Scheduled story went live: “${p.title}”`, targetType: "post", targetId: p.id })));
  }
  // 2. Send queued emails within today's allowance.
  const email = await drainOutbox(50);
  // 3. Housekeeping: old rate-limit rows, expired sessions and verification tokens.
  await db.execute(sql`delete from rate_limits where last_request < ${Date.now() - 86_400_000}`);
  await db.execute(sql`delete from sessions where expires_at < now() - interval '1 day'`);
  await db.execute(sql`delete from verifications where expires_at < now() - interval '1 day'`);
  return { published: due.length, email, ms: Date.now() - started };
}
