import "server-only";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";

const { posts, users, newsletterSubscribers, subscriptions, payments, comments, analyticsEvents, contactMessages, auditLog } = schema;

/** Everything on the command centre, in as few queries as possible. */
export async function getOverview() {
  const [postCounts, readerCount, subscriberCount, subs, recentPayments, pendingComments, unreadMessages, scheduledSoon, activity, daily, top, signups] = await Promise.all([
    db.select({ status: posts.status, n: sql<number>`count(*)::int` }).from(posts).groupBy(posts.status),
    db.select({ n: sql<number>`count(*)::int` }).from(users).where(and(eq(users.role, "reader"), sql`${users.deletedAt} is null`)),
    db.select({ n: sql<number>`count(*)::int` }).from(newsletterSubscribers).where(eq(newsletterSubscribers.status, "confirmed")),
    db.select({ status: subscriptions.status, n: sql<number>`count(*)::int` }).from(subscriptions).groupBy(subscriptions.status),
    db.select().from(payments).orderBy(desc(payments.createdAt)).limit(5),
    db.select({ n: sql<number>`count(*)::int` }).from(comments).where(eq(comments.status, "pending")),
    db.select({ n: sql<number>`count(*)::int` }).from(contactMessages).where(sql`${contactMessages.readAt} is null and ${contactMessages.archivedAt} is null`),
    db
      .select({ id: posts.id, title: posts.title, scheduledAt: posts.scheduledAt })
      .from(posts)
      .where(and(eq(posts.status, "scheduled"), gte(posts.scheduledAt, sql`now()`), lte(posts.scheduledAt, sql`now() + interval '7 days'`)))
      .orderBy(posts.scheduledAt)
      .limit(5),
    db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(8),
    // Readers per day (unique daily visitors) and completed reads, last 30 days, Lagos days.
    db.execute<{ day: string; readers: number; completed: number }>(sql`
      with days as (select generate_series((now() at time zone 'Africa/Lagos')::date - 29, (now() at time zone 'Africa/Lagos')::date, interval '1 day')::date as day)
      select to_char(d.day, 'YYYY-MM-DD') as day,
        coalesce(count(distinct e.visitor_hash) filter (where e.type = 'view'), 0)::int as readers,
        coalesce(count(*) filter (where e.type = 'read_complete'), 0)::int as completed
      from days d left join ${analyticsEvents} e on (e.created_at at time zone 'Africa/Lagos')::date = d.day
      group by d.day order by d.day`),
    db.execute<{ id: string; title: string; slug: string; views: number; completed: number }>(sql`
      select p.id, p.title, p.slug,
        count(*) filter (where e.type = 'view')::int as views,
        count(*) filter (where e.type = 'read_complete')::int as completed
      from ${analyticsEvents} e join ${posts} p on p.id = e.post_id
      where e.created_at > now() - interval '30 days'
      group by p.id order by completed desc, views desc limit 5`),
    db.execute<{ day: string; n: number }>(sql`
      with days as (select generate_series((now() at time zone 'Africa/Lagos')::date - 29, (now() at time zone 'Africa/Lagos')::date, interval '1 day')::date as day)
      select to_char(d.day, 'YYYY-MM-DD') as day, (select count(*)::int from ${newsletterSubscribers} s where s.status = 'confirmed' and (s.confirmed_at at time zone 'Africa/Lagos')::date <= d.day) as n
      from days d order by d.day`),
  ]);
  const by = (s: string) => postCounts.find((p) => p.status === s)?.n ?? 0;
  const subBy = (s: string) => subs.find((p) => p.status === s)?.n ?? 0;
  return {
    stories: { published: by("published"), drafts: by("draft"), pending: by("pending_review"), scheduled: by("scheduled"), archived: by("archived") },
    readers: readerCount[0]?.n ?? 0,
    subscribers: subscriberCount[0]?.n ?? 0,
    members: { active: subBy("active") + subBy("cancelled") + subBy("past_due"), pastDue: subBy("past_due"), expired: subBy("expired") },
    recentPayments,
    attention: { pendingComments: pendingComments[0]?.n ?? 0, unreadMessages: unreadMessages[0]?.n ?? 0, failedPayments: recentPayments.filter((p) => p.status === "failed").length, scheduledSoon },
    activity,
    daily: [...daily],
    top: [...top],
    signups: [...signups],
  };
}
