import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { getSessionUser } from "@/server/auth/session";

/** "Download my data" (NDPA 2023 / GDPR right of access and portability): everything we hold, as JSON. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response("Please sign in.", { status: 401 });
  const id = user.id;
  const [profile, bookmarks, history, reactions, comments, newsletter, subscriptions, payments, consent, preferences] = await Promise.all([
    db.query.users.findFirst({ where: eq(schema.users.id, id), columns: { name: true, email: true, emailVerified: true, createdAt: true, marketingConsentAt: true } }),
    db.select({ story: schema.posts.title, url: schema.posts.slug, savedAt: schema.bookmarks.createdAt }).from(schema.bookmarks).innerJoin(schema.posts, eq(schema.posts.id, schema.bookmarks.postId)).where(eq(schema.bookmarks.userId, id)),
    db.select({ story: schema.posts.title, progress: schema.readingHistory.progress, firstRead: schema.readingHistory.firstReadAt, lastRead: schema.readingHistory.lastReadAt, finished: schema.readingHistory.completedAt }).from(schema.readingHistory).innerJoin(schema.posts, eq(schema.posts.id, schema.readingHistory.postId)).where(eq(schema.readingHistory.userId, id)),
    db.select({ story: schema.posts.title, at: schema.reactions.createdAt }).from(schema.reactions).innerJoin(schema.posts, eq(schema.posts.id, schema.reactions.postId)).where(eq(schema.reactions.userId, id)),
    db.select({ body: schema.comments.body, status: schema.comments.status, at: schema.comments.createdAt }).from(schema.comments).where(eq(schema.comments.userId, id)),
    db.select({ email: schema.newsletterSubscribers.email, status: schema.newsletterSubscribers.status, consentAt: schema.newsletterSubscribers.consentAt, source: schema.newsletterSubscribers.source }).from(schema.newsletterSubscribers).where(eq(schema.newsletterSubscribers.userId, id)),
    db.select({ status: schema.subscriptions.status, periodEnd: schema.subscriptions.currentPeriodEnd, createdAt: schema.subscriptions.createdAt }).from(schema.subscriptions).where(eq(schema.subscriptions.userId, id)),
    db.select({ amountMinor: schema.payments.amountMinor, currency: schema.payments.currency, status: schema.payments.status, reference: schema.payments.reference, paidAt: schema.payments.paidAt }).from(schema.payments).where(eq(schema.payments.userId, id)),
    db.select({ kind: schema.consentLog.kind, granted: schema.consentLog.granted, at: schema.consentLog.createdAt }).from(schema.consentLog).where(eq(schema.consentLog.userId, id)),
    db.query.readerPreferences.findFirst({ where: eq(schema.readerPreferences.userId, id) }),
  ]);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), note: "Everything Inkinspire holds about you. IP addresses are never stored, only one-way hashes, so none appear here.", profile, preferences, bookmarks, readingHistory: history, appreciations: reactions, comments, newsletter, subscriptions, payments, consent }, null, 2);
  return new Response(body, { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="my-inkinspire-data.json"', "Cache-Control": "no-store" } });
}
