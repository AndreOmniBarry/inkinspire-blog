import { asc, eq, ne, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { getSiteSettings } from "@/server/settings";
import { env } from "@/server/env";
import { r2Configured } from "@/server/media/storage";
import { StudioHeader, StudioSection } from "@/components/studio/page-header";
import { SettingsForms } from "@/components/studio/settings-forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireStaff("settings.manage");
  const [s, staff, [{ demo }]] = await Promise.all([
    getSiteSettings(),
    db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role, twoFactorEnabled: schema.users.twoFactorEnabled }).from(schema.users).where(ne(schema.users.role, "reader")).orderBy(asc(schema.users.name)),
    db.select({ demo: sql<number>`count(*)::int` }).from(schema.posts).where(eq(schema.posts.isDemo, true)),
  ]);
  const integrations = [
    { name: "Email (Resend)", ok: !!env.RESEND_API_KEY, detail: env.RESEND_API_KEY ? `Sending as ${env.EMAIL_FROM}, up to ${env.EMAIL_DAILY_LIMIT} emails a day.` : "Emails are queued but not sent. Add RESEND_API_KEY to send verification, reset and newsletter emails." },
    { name: "Image storage (Cloudflare R2)", ok: r2Configured(), detail: r2Configured() ? "Images are stored in your R2 bucket." : "Images are stored on this computer (development only). Add the R2 settings before going live." },
    { name: "Spam protection (Cloudflare Turnstile)", ok: !!env.TURNSTILE_SECRET_KEY, detail: env.TURNSTILE_SECRET_KEY ? "Forms are protected." : "Forms use honeypots and rate limits only. Add Turnstile keys for stronger protection." },
    { name: "Google Analytics 4", ok: !!env.NEXT_PUBLIC_GA_MEASUREMENT_ID, detail: env.NEXT_PUBLIC_GA_MEASUREMENT_ID ? "Loads only for readers who accept analytics cookies." : "Optional. Inkinspire’s own reading statistics work without it." },
    { name: "Payments (Paystack)", ok: !!env.PAYSTACK_SECRET_KEY, detail: env.PAYSTACK_SECRET_KEY ? (env.PAYSTACK_SECRET_KEY.startsWith("sk_test_") ? "Connected in TEST mode: no real money moves." : "Connected in LIVE mode.") : "Not connected yet. Memberships open in Phase 3." },
    { name: "Scheduled jobs", ok: !!env.CRON_SECRET, detail: env.CRON_SECRET ? "Background jobs are protected. Point a free scheduler (cron-job.org) at /api/cron/tick every minute; see RUNBOOK." : "Add CRON_SECRET so the minute job can send emails and tidy up. Scheduled stories still go live on time without it." },
  ];
  return (
    <>
      <StudioHeader title="Settings" description="Your publication’s identity, links, search defaults and team." />
      <StudioSection>
        <SettingsForms s={s} integrations={integrations} staff={staff.map((u) => ({ ...u, twoFactorEnabled: !!u.twoFactorEnabled }))} canStaff={can(user.role, "staff.manage")} canDemo={can(user.role, "demo.remove")} demoCount={demo} />
      </StudioSection>
    </>
  );
}
