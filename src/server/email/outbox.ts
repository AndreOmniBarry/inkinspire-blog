import "server-only";
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { env } from "@/server/env";
import { renderTemplate, type TemplateKey, type TemplatePayloads } from "./templates";
import { getTransport } from "./transport";

const { emailOutbox, emailSuppressions } = schema;

/** Transactional mail (verification, resets, receipts) = 1; marketing (newsletters) = 9. */
export const PRIORITY = { critical: 1, transactional: 3, notification: 5, marketing: 9 } as const;

export async function enqueueEmail<K extends TemplateKey>(opts: {
  to: string;
  template: K;
  payload: TemplatePayloads[K];
  idempotencyKey: string;
  priority?: number;
  marketing?: boolean;
  campaignId?: string;
  sendAt?: Date;
}) {
  await db
    .insert(emailOutbox)
    .values({
      to: opts.to.trim().toLowerCase(),
      template: opts.template,
      payload: opts.payload,
      idempotencyKey: opts.idempotencyKey,
      priority: opts.priority ?? PRIORITY.transactional,
      marketing: opts.marketing ?? false,
      campaignId: opts.campaignId,
      nextAttemptAt: opts.sendAt ?? new Date(),
    })
    .onConflictDoNothing({ target: emailOutbox.idempotencyKey });
}

/** How many emails went out since midnight UTC (the provider's daily window). */
async function sentToday(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(emailOutbox)
    .where(and(eq(emailOutbox.status, "sent"), gte(emailOutbox.sentAt, sql`date_trunc('day', now() at time zone 'utc') at time zone 'utc'`)));
  return row?.n ?? 0;
}

const backoffMinutes = [1, 5, 30, 120, 720];

/**
 * Sends due emails, highest priority first, within the provider's daily allowance (ADR-004).
 * Safe to run concurrently: rows are claimed with FOR UPDATE SKIP LOCKED.
 */
export async function drainOutbox(limit = 25): Promise<{ sent: number; failed: number; deferred: boolean }> {
  const allowance = Math.max(0, env.EMAIL_DAILY_LIMIT - (await sentToday()));
  if (allowance === 0) return { sent: 0, failed: 0, deferred: true };
  const take = Math.min(limit, allowance);

  const claimed = await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: emailOutbox.id })
      .from(emailOutbox)
      .where(and(eq(emailOutbox.status, "queued"), lte(emailOutbox.nextAttemptAt, new Date())))
      .orderBy(asc(emailOutbox.priority), asc(emailOutbox.nextAttemptAt))
      .limit(take)
      .for("update", { skipLocked: true });
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    return tx
      .update(emailOutbox)
      .set({ status: "sending", attempts: sql`${emailOutbox.attempts} + 1` })
      .where(inArray(emailOutbox.id, ids))
      .returning();
  });

  let sent = 0;
  let failed = 0;
  const transport = getTransport();
  for (const row of claimed) {
    const suppressed = await db.query.emailSuppressions.findFirst({ where: eq(emailSuppressions.email, row.to) });
    if (suppressed) {
      await db.update(emailOutbox).set({ status: "suppressed", lastError: `suppressed: ${suppressed.reason}` }).where(eq(emailOutbox.id, row.id));
      continue;
    }
    try {
      const payload = row.payload as Record<string, unknown>;
      const unsubscribeUrl = typeof payload.unsubscribeUrl === "string" ? payload.unsubscribeUrl : undefined;
      const rendered = renderTemplate(row.template as TemplateKey, payload as never, {
        siteUrl: env.SITE_URL,
        footerHtml: unsubscribeUrl
          ? `You receive this because you subscribed to Inkinspire. <a href="${unsubscribeUrl}" style="color:#6A6358">Unsubscribe</a>.`
          : undefined,
      });
      const headers: Record<string, string> = {};
      if (row.marketing && unsubscribeUrl) {
        headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
        headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
      }
      const result = await transport.send({ to: row.to, ...rendered, headers, idempotencyKey: row.idempotencyKey });
      await db
        .update(emailOutbox)
        .set({ status: "sent", sentAt: new Date(), providerMessageId: result.id, lastError: null })
        .where(eq(emailOutbox.id, row.id));
      sent++;
    } catch (e) {
      failed++;
      const err = e as Error & { permanent?: boolean };
      const attempts = row.attempts;
      const giveUp = err.permanent || attempts >= backoffMinutes.length;
      await db
        .update(emailOutbox)
        .set({
          status: giveUp ? "failed" : "queued",
          lastError: err.message.slice(0, 500),
          nextAttemptAt: new Date(Date.now() + (backoffMinutes[attempts - 1] ?? 720) * 60_000),
        })
        .where(eq(emailOutbox.id, row.id));
    }
  }
  return { sent, failed, deferred: claimed.length === take && allowance === take };
}
