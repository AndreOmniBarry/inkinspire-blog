import "server-only";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";

const { entitlements } = schema;

/**
 * Premium access is an entitlement, not a role. A reader is entitled when they hold an
 * unrevoked entitlement whose window contains "now". Subscriptions create and end entitlements
 * through the state machine (src/server/billing/state-machine.ts); complimentary access is granted
 * by the owner in Studio with a reason (audited).
 */
export async function hasPremium(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const [row] = await db
    .select({ one: sql<number>`1` })
    .from(entitlements)
    .where(
      and(
        eq(entitlements.userId, userId),
        eq(entitlements.scope, "premium"),
        isNull(entitlements.revokedAt),
        sql`${entitlements.startsAt} <= now()`,
        or(isNull(entitlements.endsAt), gt(entitlements.endsAt, sql`now()`)),
      ),
    )
    .limit(1);
  return !!row;
}
