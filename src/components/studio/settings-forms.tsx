"use client";

import { useActionState, useState, useTransition } from "react";
import { inviteStaff, removeDemo, saveSettings, setRole, type SettingsState } from "@/app/studio/actions/settings";
import type { SiteSettings } from "@/server/settings";
import { roleLabels, type Role } from "@/server/auth/permissions";

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-20 rounded-[var(--radius-l)] border border-rule bg-surface p-5 md:p-7">
      <h2 id={`${id}-t`} className="font-display text-step-2">{title}</h2>
      {description && <p className="mt-1 max-w-[60ch] text-step-n1 text-ink-soft">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SettingsForm({ section, children }: { section: string; children: React.ReactNode }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="_section" value={section} />
      {children}
      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={pending} className="min-h-11 rounded-full bg-accent px-6 text-step-n1 font-semibold text-on-accent disabled:opacity-60">{pending ? "Saving…" : "Save"}</button>
        <span role="status" className={state.error ? "text-step-n1 text-danger" : "text-step-n1 text-success"}>{state.error ?? state.message}</span>
      </div>
    </form>
  );
}

const F = ({ label, name, value, type = "text", hint, textarea }: { label: string; name: string; value?: string | number; type?: string; hint?: string; textarea?: boolean }) => (
  <div>
    <label htmlFor={`s-${name}`} className="mb-1.5 block text-step-n1 font-semibold">{label}{hint && <span className="ml-1 font-normal text-ink-muted">{hint}</span>}</label>
    {textarea ? <textarea id={`s-${name}`} name={name} defaultValue={value} rows={3} className="field" /> : <input id={`s-${name}`} name={name} type={type} defaultValue={value} className="field" />}
  </div>
);

export function SettingsForms({ s, integrations, staff, canStaff, canDemo, demoCount }: {
  s: SiteSettings;
  integrations: Array<{ name: string; ok: boolean; detail: string }>;
  staff: Array<{ id: string; name: string; email: string; role: Role; twoFactorEnabled: boolean }>;
  canStaff: boolean;
  canDemo: boolean;
  demoCount: number;
}) {
  return (
    <div className="space-y-6">
      <Section id="identity" title="Site identity" description="Your publication’s name and how it describes itself.">
        <SettingsForm section="identity">
          <F label="Name" name="name" value={s.identity.name} />
          <F label="Tagline" name="tagline" value={s.identity.tagline} hint="(shown in the footer and on share cards)" />
          <F label="Description" name="description" value={s.identity.description} textarea />
          <F label="Contact email" name="contactEmail" type="email" value={s.identity.contactEmail} hint="(contact-form messages are sent here)" />
        </SettingsForm>
      </Section>
      <Section id="socials" title="Social links" description="Shown in the footer, on the contact page and on author pages. Leave empty to hide.">
        <SettingsForm section="socials">
          <div className="grid gap-4 md:grid-cols-2">
            {(["instagram", "x", "facebook", "linkedin", "tiktok", "youtube", "website"] as const).map((k) => (
              <F key={k} label={{ instagram: "Instagram", x: "X (Twitter)", facebook: "Facebook", linkedin: "LinkedIn", tiktok: "TikTok", youtube: "YouTube", website: "Website" }[k]} name={k} type="url" value={s.socials[k] ?? ""} />
            ))}
          </div>
        </SettingsForm>
      </Section>
      <Section id="seo" title="Search engines" description="Defaults used when a page has no title or description of its own.">
        <SettingsForm section="seo">
          <F label="Homepage title" name="defaultTitle" value={s.seo.defaultTitle} />
          <F label="Title pattern" name="titleTemplate" value={s.seo.titleTemplate} hint="(%s is replaced by the page’s title)" />
          <F label="Default description" name="defaultDescription" value={s.seo.defaultDescription} textarea />
        </SettingsForm>
      </Section>
      <Section id="community" title="Comments" description="Saved now; comments open in Phase 2.">
        <SettingsForm section="community">
          <label className="flex items-start gap-3"><input type="checkbox" name="commentsEnabled" defaultChecked={s.community.commentsEnabled} className="mt-1 size-4 accent-[var(--accent)]" /><span><strong>Allow comments on the site</strong><span className="block text-step-n1 text-ink-muted">You can still turn them off on individual stories.</span></span></label>
          <label className="flex items-start gap-3"><input type="checkbox" name="holdFirstComments" defaultChecked={s.community.holdFirstComments} className="mt-1 size-4 accent-[var(--accent)]" /><span><strong>Hold a reader’s first comment for approval</strong><span className="block text-step-n1 text-ink-muted">Recommended. Once you approve someone, their later comments appear straight away.</span></span></label>
        </SettingsForm>
      </Section>
      <Section id="membership" title="Membership rules" description="Saved now; used once memberships open (Phase 3).">
        <SettingsForm section="membership">
          <div className="grid gap-4 md:grid-cols-2">
            <F label="Grace period after a failed payment" name="gracePeriodDays" type="number" value={s.membership.gracePeriodDays} hint="(days)" />
            <F label="Renewal reminder" name="renewalReminderDays" type="number" value={s.membership.renewalReminderDays} hint="(days before)" />
          </div>
          <div>
            <label htmlFor="s-refund" className="mb-1.5 block text-step-n1 font-semibold">When a payment is refunded</label>
            <select id="s-refund" name="refundPolicy" defaultValue={s.membership.refundPolicy} className="field">
              <option value="keep_until_period_end">Keep access until the end of the paid period</option>
              <option value="revoke_immediately">End access straight away</option>
            </select>
          </div>
        </SettingsForm>
      </Section>
      <Section id="integrations" title="Connected services" description="These are set by your developer or host, in the environment settings, never in the database. Ask for help changing them.">
        <ul className="divide-y divide-rule">
          {integrations.map((i) => (
            <li key={i.name} className="flex items-start gap-3 py-3">
              <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${i.ok ? "bg-success" : "bg-warning"}`} />
              <div><p className="font-semibold">{i.name}: <span className={i.ok ? "text-success" : "text-warning"}>{i.ok ? "Connected" : "Not connected"}</span></p><p className="text-step-n1 text-ink-soft">{i.detail}</p></div>
            </li>
          ))}
        </ul>
      </Section>
      {canStaff && <StaffSection staff={staff} />}
      {canDemo && <DemoSection count={demoCount} />}
    </div>
  );
}

function StaffSection({ staff }: { staff: Array<{ id: string; name: string; email: string; role: Role; twoFactorEnabled: boolean }> }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(inviteStaff, {});
  const [msg, setMsg] = useState<string | null>(null);
  const [, start] = useTransition();
  return (
    <Section id="staff" title="Team" description="People who can use the Studio. Everyone must use two-step verification.">
      <ul className="divide-y divide-rule">
        {staff.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1"><p className="font-semibold">{u.name}</p><p className="truncate text-step-n2 text-ink-muted">{u.email} · {u.twoFactorEnabled ? "two-step on" : "two-step not set up yet"}</p></div>
            <label className="sr-only" htmlFor={`role-${u.id}`}>Role for {u.name}</label>
            <select id={`role-${u.id}`} defaultValue={u.role} disabled={u.role === "owner"} onChange={(e) => start(async () => { const r = await setRole(u.id, e.target.value); setMsg(r.error ?? `Updated ${u.name}.`); })} className="field w-auto">
              {(["owner", "admin", "editor", "author", "moderator", "reader"] as Role[]).map((r) => <option key={r} value={r} disabled={r === "owner"}>{roleLabels[r].name}</option>)}
            </select>
          </li>
        ))}
      </ul>
      {msg && <p role="status" className="mt-2 text-step-n1 text-ink-soft">{msg}</p>}
      <details className="mt-4">
        <summary className="cursor-pointer text-step-n1 font-semibold text-accent">Invite someone</summary>
        <form action={action} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
          <F label="Name" name="name" />
          <F label="Email" name="email" type="email" />
          <div><label htmlFor="inv-role" className="mb-1.5 block text-step-n1 font-semibold">Role</label><select id="inv-role" name="role" defaultValue="author" className="field">{(["admin", "editor", "author", "moderator"] as Role[]).map((r) => <option key={r} value={r}>{roleLabels[r].name}</option>)}</select></div>
          <button type="submit" disabled={pending} className="min-h-11 rounded-full bg-accent px-5 font-semibold text-on-accent">{pending ? "Sending…" : "Send invitation"}</button>
        </form>
        <p role="status" className={`mt-2 text-step-n1 ${state.error ? "text-danger" : "text-success"}`}>{state.error ?? state.message}</p>
        <ul className="mt-3 space-y-1 text-step-n2 text-ink-muted">{(["admin", "editor", "author", "moderator"] as Role[]).map((r) => <li key={r}><strong>{roleLabels[r].name}:</strong> {roleLabels[r].description}</li>)}</ul>
      </details>
    </Section>
  );
}

function DemoSection({ count }: { count: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Section id="demo" title="Demo content" description="The sample stories that came with Inkinspire, so you could see the design working. Remove them when you’re ready to publish your own.">
      {count > 0 ? (
        <button type="button" disabled={pending} onClick={() => window.confirm(`Remove all ${count} demo stories? Your themes, pages and settings stay. This can’t be undone.`) && start(async () => setMsg((await removeDemo()).message ?? null))} className="min-h-11 rounded-full border border-danger/60 px-5 font-semibold text-danger">
          {pending ? "Removing…" : `Remove ${count} demo stor${count === 1 ? "y" : "ies"}`}
        </button>
      ) : (
        <p className="text-step-n1 text-ink-soft">No demo content left. Everything on the site is yours.</p>
      )}
      {msg && <p role="status" className="mt-3 text-step-n1 text-success">{msg}</p>}
    </Section>
  );
}
