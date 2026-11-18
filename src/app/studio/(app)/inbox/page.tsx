import { desc, isNull } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { StudioHeader, StudioSection, EmptyState } from "@/components/studio/page-header";
import { InboxList } from "@/components/studio/inbox-list";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  await requireStaff("reader.view");
  const rows = await db.select().from(schema.contactMessages).where(isNull(schema.contactMessages.archivedAt)).orderBy(desc(schema.contactMessages.createdAt)).limit(200);
  return (
    <>
      <StudioHeader title="Inbox" description="Messages from the contact page. You also get each one by email." />
      <StudioSection>
        {rows.length ? (
          <InboxList messages={rows.map((r) => ({ id: r.id, name: r.name, email: r.email, topic: r.topic, subject: r.subject, message: r.message, readAt: r.readAt?.toISOString() ?? null, createdAt: formatDateTime(r.createdAt) }))} />
        ) : (
          <EmptyState title="No messages yet" body="When readers write to you through the contact page, their messages appear here." />
        )}
      </StudioSection>
    </>
  );
}
