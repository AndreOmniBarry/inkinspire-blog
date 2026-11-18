import "server-only";
import { sql } from "drizzle-orm";
import { db, schema } from "@/server/db";

/**
 * Fixed-window rate limit stored in Postgres (works across serverless instances, no extra service).
 * Returns true when the action is allowed.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const k = `app:${key}`;
  const [row] = await db
    .insert(schema.rateLimits)
    .values({ key: k, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: schema.rateLimits.key,
      set: {
        count: sql`case when ${schema.rateLimits.lastRequest} < ${windowStart} then 1 else ${schema.rateLimits.count} + 1 end`,
        lastRequest: sql`case when ${schema.rateLimits.lastRequest} < ${windowStart} then ${now} else ${schema.rateLimits.lastRequest} end`,
      },
    })
    .returning({ count: schema.rateLimits.count });
  return (row?.count ?? 1) <= max;
}
