import { and, gte, lt, or, eq, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { StudioHeader, StudioSection } from "@/components/studio/page-header";
import { EditorialCalendar } from "@/components/studio/calendar";

export const metadata = { title: "Calendar" };

/** Today's date in Lagos (UTC+1, no daylight saving). */
function lagosToday() {
  return new Date(Date.now() + 3600_000).toISOString().slice(0, 10);
}

export default async function CalendarPage({ searchParams }: PageProps<"/studio/calendar">) {
  await requireStaff("post.publish");
  const sp = await searchParams;
  const today = lagosToday();
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1) - 7 * 864e5);
  const to = new Date(Date.UTC(y, m, 1) + 14 * 864e5);
  const when = sql<Date>`coalesce(${schema.posts.scheduledAt}, ${schema.posts.publishedAt})`;
  const rows = await db
    .select({ id: schema.posts.id, title: schema.posts.title, status: schema.posts.status, when })
    .from(schema.posts)
    .where(and(or(eq(schema.posts.status, "scheduled"), eq(schema.posts.status, "published")), gte(when, from), lt(when, to)));
  const items = rows.map((r) => {
    const lagos = new Date(new Date(r.when).getTime() + 3600_000).toISOString();
    return { id: r.id, title: r.title || "Untitled", status: r.status as "scheduled" | "published", day: lagos.slice(0, 10), time: lagos.slice(11, 16) };
  });
  return (
    <>
      <StudioHeader title="Editorial calendar" description="What’s been published and what’s coming. Drag a scheduled story to a new day to move it." />
      <StudioSection><EditorialCalendar items={items} month={month} today={today} /></StudioSection>
    </>
  );
}
