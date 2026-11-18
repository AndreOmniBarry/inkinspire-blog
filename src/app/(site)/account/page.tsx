import type { Metadata } from "next";
import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireUser } from "@/server/auth/session";
import { hasPremium } from "@/server/billing/entitlements";
import { formatDate } from "@/lib/format";
import { DeleteAccount, HistoryList, PasswordAndSignOut, ProfileForm, SavedList } from "@/components/account/account-forms";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="container-ink py-10 md:py-16">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-[var(--radius-l)] bg-sunken" />}>
        <Account />
      </Suspense>
    </div>
  );
}

async function Account() {
  const user = await requireUser("/account");
  const [saved, history, member, sub] = await Promise.all([
    db.select({ id: schema.posts.id, slug: schema.posts.slug, title: schema.posts.title, savedAt: schema.bookmarks.createdAt }).from(schema.bookmarks).innerJoin(schema.posts, eq(schema.posts.id, schema.bookmarks.postId)).where(eq(schema.bookmarks.userId, user.id)).orderBy(desc(schema.bookmarks.createdAt)),
    db.select({ slug: schema.posts.slug, title: schema.posts.title, progress: schema.readingHistory.progress, completedAt: schema.readingHistory.completedAt, lastRead: schema.readingHistory.lastReadAt }).from(schema.readingHistory).innerJoin(schema.posts, eq(schema.posts.id, schema.readingHistory.postId)).where(eq(schema.readingHistory.userId, user.id)).orderBy(desc(schema.readingHistory.lastReadAt)).limit(50),
    hasPremium(user.id),
    db.query.entitlements.findFirst({ where: eq(schema.entitlements.userId, user.id), orderBy: (e, { desc: d }) => d(e.endsAt) }),
  ]);
  const section = "rounded-[var(--radius-l)] border border-rule bg-surface p-5 md:p-7";
  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <nav aria-label="Account" className="lg:col-span-3">
        <p className="eyebrow">Your account</p>
        <h1 className="mt-2 font-display text-step-4">Hello, {user.name.split(" ")[0]}.</h1>
        <ul className="mt-6 space-y-1 text-step-n1">
          {[["#saved", "Saved stories"], ["#history", "Reading history"], ["#membership", "Membership"], ["#profile", "Profile"], ["#security", "Password & sign-out"], ["#privacy", "Your data"]].map(([h, l]) => (
            <li key={h}><a href={h} className="block rounded px-2 py-2 text-ink-soft hover:bg-sunken hover:text-ink">{l}</a></li>
          ))}
        </ul>
      </nav>
      <div className="space-y-8 lg:col-span-9">
        <section id="saved" aria-labelledby="saved-t" className="scroll-mt-24"><h2 id="saved-t" className="mb-4 font-display text-step-3">Saved stories</h2><SavedList items={saved.map((s) => ({ ...s, savedAt: formatDate(s.savedAt, "short") }))} /></section>
        <section id="history" aria-labelledby="history-t" className="scroll-mt-24"><h2 id="history-t" className="mb-4 font-display text-step-3">Reading history</h2><HistoryList items={history.map((h) => ({ slug: h.slug, title: h.title, progress: h.progress, finished: !!h.completedAt, lastRead: formatDate(h.lastRead, "short") }))} /></section>
        <section id="membership" aria-labelledby="mem-t" className={`${section} scroll-mt-24`}>
          <h2 id="mem-t" className="font-display text-step-2">Membership</h2>
          {member ? (
            <p className="mt-2 text-step-0">You’re a member{sub?.endsAt ? `, with access until ${formatDate(sub.endsAt)}` : ""}. Thank you for keeping Inkinspire going.</p>
          ) : sub ? (
            <><p className="mt-2 text-step-0 text-ink-soft">Your membership ended{sub.endsAt ? ` on ${formatDate(sub.endsAt)}` : ""}.</p><ButtonLink href="/membership" className="mt-4">Renew membership</ButtonLink></>
          ) : (
            <><p className="mt-2 text-step-0 text-ink-soft">You’re reading for free. Members read every story, including exclusive essays, letters and collections.</p><ButtonLink href="/membership" className="mt-4">See membership</ButtonLink></>
          )}
        </section>
        <section id="profile" aria-labelledby="prof-t" className={`${section} scroll-mt-24`}><h2 id="prof-t" className="mb-4 font-display text-step-2">Profile</h2><ProfileForm name={user.name} email={user.email} /></section>
        <section id="security" aria-labelledby="sec-t" className={`${section} scroll-mt-24`}><h2 id="sec-t" className="mb-4 font-display text-step-2">Password & sign-out</h2><PasswordAndSignOut /></section>
        <section id="privacy" aria-labelledby="priv-t" className={`${section} scroll-mt-24`}>
          <h2 id="priv-t" className="font-display text-step-2">Your data</h2>
          <p className="mt-2 max-w-[60ch] text-step-n1 text-ink-soft">Under Nigeria’s Data Protection Act 2023 (and the GDPR, if you live in Europe or the UK) you can download everything we hold about you, or delete your account.</p>
          <div className="mt-5 flex flex-wrap gap-3"><a href="/api/account/export" className="inline-flex min-h-11 items-center rounded-full border border-rule-strong px-5 font-semibold">Download my data</a></div>
          <div className="mt-6 border-t border-rule pt-6"><DeleteAccount /></div>
        </section>
      </div>
    </div>
  );
}
