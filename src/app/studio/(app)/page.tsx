import Link from "next/link";
import { AlertCircle, CalendarClock, Inbox, MessageSquare, PenLine } from "lucide-react";
import { requireStaff } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { getOverview } from "@/server/studio/overview";
import { StudioHeader, StudioSection } from "@/components/studio/page-header";
import { AreaChart } from "@/components/studio/charts/sparkline";
import { formatDateTime, formatMoney } from "@/lib/format";

export default async function OverviewPage() {
  const user = await requireStaff();
  const o = await getOverview();
  const greeting = (() => {
    const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(new Date()));
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();
  const readers30 = o.daily.reduce((a, d) => a + d.readers, 0);
  const completed30 = o.daily.reduce((a, d) => a + d.completed, 0);

  const attention = [
    o.stories.pending > 0 && can(user.role, "post.publish") && { href: "/studio/library?status=pending_review", icon: PenLine, text: `${o.stories.pending} stor${o.stories.pending === 1 ? "y" : "ies"} waiting for your review` },
    o.attention.pendingComments > 0 && can(user.role, "comment.moderate") && { href: "/studio/comments", icon: MessageSquare, text: `${o.attention.pendingComments} comment${o.attention.pendingComments === 1 ? "" : "s"} to moderate` },
    o.attention.unreadMessages > 0 && can(user.role, "reader.view") && { href: "/studio/inbox", icon: Inbox, text: `${o.attention.unreadMessages} unread message${o.attention.unreadMessages === 1 ? "" : "s"}` },
    o.attention.failedPayments > 0 && can(user.role, "payment.view") && { href: "/studio/payments", icon: AlertCircle, text: `${o.attention.failedPayments} failed payment${o.attention.failedPayments === 1 ? "" : "s"}` },
    ...o.attention.scheduledSoon.map((s) => ({ href: `/studio/write/${s.id}`, icon: CalendarClock, text: `“${s.title}” goes live ${formatDateTime(s.scheduledAt!)}` })),
  ].filter(Boolean) as Array<{ href: string; icon: typeof PenLine; text: string }>;

  const cards = [
    { label: "Published stories", value: o.stories.published, href: "/studio/library?status=published" },
    { label: "Drafts", value: o.stories.drafts, href: "/studio/library?status=draft" },
    { label: "Scheduled", value: o.stories.scheduled, href: "/studio/library?status=scheduled" },
    { label: "Pending review", value: o.stories.pending, href: "/studio/library?status=pending_review" },
    { label: "Registered readers", value: o.readers },
    { label: "Newsletter subscribers", value: o.subscribers },
    { label: "Active members", value: o.members.active },
    { label: "Expired memberships", value: o.members.expired },
  ];

  return (
    <>
      <StudioHeader
        title={`${greeting}, ${user.name.split(" ")[0]}.`}
        description="Here’s how Inkinspire is doing. Press Ctrl+K (⌘K on a Mac) to jump anywhere."
        actions={
          can(user.role, "post.create") ? (
            <Link href="/studio/write/new" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-step-n1 font-semibold text-on-accent hover:bg-accent-hover">
              <PenLine aria-hidden size={16} /> New story
            </Link>
          ) : undefined
        }
      />

      <StudioSection title="Needs your attention">
        {attention.length ? (
          <ul className="divide-y divide-rule overflow-hidden rounded-[var(--radius-l)] border border-rule bg-surface">
            {attention.map((a) => (
              <li key={a.href + a.text}>
                <Link href={a.href as never} className="flex min-h-14 items-center gap-3 px-4 hover:bg-sunken">
                  <a.icon aria-hidden size={18} className="shrink-0 text-accent" />
                  <span className="text-step-n1">{a.text}</span>
                  <span aria-hidden className="ml-auto text-ink-muted">→</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[var(--radius-l)] border border-rule bg-surface px-5 py-4 text-step-n1 text-ink-soft">All clear. Nothing is waiting on you.</p>
        )}
      </StudioSection>

      <StudioSection title="At a glance">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {cards.map((c) => {
            const body = (
              <>
                <p className="font-display text-step-4 leading-none tabular-nums">{c.value.toLocaleString("en-GB")}</p>
                <p className="mt-2 text-step-n2 text-ink-soft">{c.label}</p>
              </>
            );
            return (
              <li key={c.label}>
                {c.href ? (
                  <Link href={c.href as never} className="block h-full rounded-[var(--radius-l)] border border-rule bg-surface p-4 hover:border-rule-strong">{body}</Link>
                ) : (
                  <div className="h-full rounded-[var(--radius-l)] border border-rule bg-surface p-4">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </StudioSection>

      <div className="grid gap-0 xl:grid-cols-2">
        <StudioSection title="Readers, last 30 days">
          <div className="rounded-[var(--radius-l)] border border-rule bg-surface p-4 md:p-5">
            <p className="mb-3 text-step-n1 text-ink-soft">
              <strong className="text-ink">{readers30.toLocaleString("en-GB")}</strong> reader-days · <strong className="text-ink">{completed30.toLocaleString("en-GB")}</strong> stories read to the end
            </p>
            <AreaChart data={o.daily} series={[{ key: "readers", name: "Daily readers", colour: 1 }, { key: "completed", name: "Reads completed", colour: 2 }]} label="Daily readers and completed reads over the last 30 days" />
          </div>
        </StudioSection>
        <StudioSection title="Newsletter growth">
          <div className="rounded-[var(--radius-l)] border border-rule bg-surface p-4 md:p-5">
            <p className="mb-3 text-step-n1 text-ink-soft"><strong className="text-ink">{o.subscribers.toLocaleString("en-GB")}</strong> confirmed subscribers</p>
            <AreaChart data={o.signups} series={[{ key: "n", name: "Subscribers", colour: 1 }]} label="Confirmed newsletter subscribers over the last 30 days" />
          </div>
        </StudioSection>
      </div>

      <div className="grid gap-0 xl:grid-cols-2">
        <StudioSection title="Top stories this month">
          {o.top.length ? (
            <ol className="divide-y divide-rule rounded-[var(--radius-l)] border border-rule bg-surface">
              {o.top.map((t, i) => (
                <li key={t.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="w-5 font-display text-step-1 text-gilt-ink tabular-nums">{i + 1}</span>
                  <Link href={`/studio/write/${t.id}`} className="min-w-0 flex-1 truncate font-semibold hover:text-accent">{t.title}</Link>
                  <span className="shrink-0 text-right text-step-n2 text-ink-soft tabular-nums">{t.completed} finished · {t.views} views</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-[var(--radius-l)] border border-rule bg-surface px-5 py-4 text-step-n1 text-ink-soft">Reading data appears here once readers start visiting.</p>
          )}
        </StudioSection>
        <StudioSection title="Recent activity">
          <ul className="divide-y divide-rule rounded-[var(--radius-l)] border border-rule bg-surface">
            {o.activity.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <p className="text-step-n1">{a.summary}</p>
                <p className="mt-0.5 text-step-n2 text-ink-muted">{a.actorLabel} · {formatDateTime(a.createdAt)}</p>
              </li>
            ))}
            {!o.activity.length && <li className="px-4 py-3 text-step-n1 text-ink-soft">Nothing yet.</li>}
          </ul>
        </StudioSection>
      </div>

      {can(user.role, "payment.view") && (
        <StudioSection title="Recent payments">
          {o.recentPayments.length ? (
            <ul className="divide-y divide-rule rounded-[var(--radius-l)] border border-rule bg-surface">
              {o.recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-4 py-3 text-step-n1">
                  <span>{formatMoney(p.amountMinor, p.currency)}</span>
                  <span className="text-ink-soft capitalize">{p.status.replace("_", " ")}</span>
                  <span className="text-step-n2 text-ink-muted">{formatDateTime(p.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[var(--radius-l)] border border-rule bg-surface px-5 py-4 text-step-n1 text-ink-soft">No payments yet. Memberships open in Phase 3, once Paystack is connected and tested.</p>
          )}
        </StudioSection>
      )}
    </>
  );
}
