import "server-only";
import { db, schema } from "@/server/db";
import type { SessionUser } from "@/server/auth/session";
import { clientIp } from "@/server/security/spam";
import { hashIdentifier } from "@/server/security/hash";

/** Every sensitive action is recorded: who, what, when (blueprint §9, brief §4.1). */
export async function audit(
  actor: Pick<SessionUser, "id" | "email"> | null,
  action: string,
  summary: string,
  target?: { type: string; id: string },
  meta?: Record<string, unknown>,
) {
  let ipHash: string | null = null;
  try {
    ipHash = hashIdentifier(await clientIp());
  } catch {
    /* outside a request (scripts, cron) */
  }
  await db.insert(schema.auditLog).values({
    actorId: actor?.id ?? null,
    actorLabel: actor?.email ?? "system",
    action,
    summary,
    targetType: target?.type,
    targetId: target?.id,
    meta,
    ipHash,
  });
}
