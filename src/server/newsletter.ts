import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { enqueueEmail, PRIORITY } from "@/server/email/outbox";
import { env } from "@/server/env";
import { createToken, hashIdentifier, sha256 } from "@/server/security/hash";

const { newsletterSubscribers: subs, consentLog } = schema;

export type SubscribeResult = "check_inbox" | "already_subscribed";

/**
 * Double opt-in (blueprint §6): store as pending, email a confirmation link, record consent.
 * Always responds the same way for new and pending addresses (no enumeration).
 */
export async function subscribe(emailRaw: string, source: string, ip: string | null): Promise<SubscribeResult> {
  const email = emailRaw.trim().toLowerCase();
  const existing = await db.query.newsletterSubscribers.findFirst({ where: sql`lower(${subs.email}) = ${email}` });
  if (existing?.status === "confirmed") return "already_subscribed";

  const confirm = createToken();
  const unsub = createToken();
  const values = {
    email,
    status: "pending" as const,
    confirmTokenHash: confirm.hash,
    confirmTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
    source,
    consentAt: new Date(),
    consentIpHash: hashIdentifier(ip),
  };
  let id: string;
  if (existing) {
    await db.update(subs).set({ ...values, unsubscribeTokenHash: unsub.hash, unsubscribedAt: null }).where(eq(subs.id, existing.id));
    id = existing.id;
  } else {
    const [row] = await db.insert(subs).values({ ...values, unsubscribeTokenHash: unsub.hash }).returning({ id: subs.id });
    id = row.id;
  }
  await db.insert(consentLog).values({
    subject: email,
    kind: "marketing_email",
    granted: { newsletter: true, stage: "requested" },
    source,
    ipHash: hashIdentifier(ip),
  });
  await enqueueEmail({
    to: email,
    template: "newsletter_confirm",
    payload: { url: `${env.SITE_URL}/newsletter/confirm?token=${confirm.token}&s=${unsub.token}` },
    idempotencyKey: `nl-confirm:${id}:${confirm.hash.slice(0, 12)}`,
    priority: PRIORITY.transactional,
  });
  return "check_inbox";
}

export async function confirmSubscription(token: string, unsubToken: string | null): Promise<"confirmed" | "invalid"> {
  if (!token) return "invalid";
  const row = await db.query.newsletterSubscribers.findFirst({ where: eq(subs.confirmTokenHash, sha256(token)) });
  if (!row || !row.confirmTokenExpiresAt || row.confirmTokenExpiresAt < new Date()) return "invalid";
  await db
    .update(subs)
    .set({ status: "confirmed", confirmedAt: new Date(), confirmTokenHash: null, confirmTokenExpiresAt: null })
    .where(eq(subs.id, row.id));
  await db.insert(consentLog).values({ subject: row.email, kind: "marketing_email", granted: { newsletter: true, stage: "confirmed" }, source: "double_opt_in" });
  if (unsubToken && sha256(unsubToken) === row.unsubscribeTokenHash) {
    await enqueueEmail({
      to: row.email,
      template: "newsletter_welcome",
      payload: { unsubscribeUrl: unsubscribeUrlFor(unsubToken) },
      idempotencyKey: `nl-welcome:${row.id}`,
      priority: PRIORITY.notification,
    });
  }
  return "confirmed";
}

export function unsubscribeUrlFor(token: string) {
  return `${env.SITE_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

export async function unsubscribe(token: string): Promise<"unsubscribed" | "invalid"> {
  if (!token) return "invalid";
  const row = await db.query.newsletterSubscribers.findFirst({ where: eq(subs.unsubscribeTokenHash, sha256(token)) });
  if (!row) return "invalid";
  if (row.status !== "unsubscribed") {
    await db.update(subs).set({ status: "unsubscribed", unsubscribedAt: new Date() }).where(eq(subs.id, row.id));
    await db.insert(consentLog).values({ subject: row.email, kind: "marketing_email", granted: { newsletter: false }, source: "unsubscribe_link" });
  }
  return "unsubscribed";
}
