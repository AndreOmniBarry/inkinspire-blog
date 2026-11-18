import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db, schema } from "@/server/db";
import { auth } from "@/server/auth/auth";
import { requireStaff } from "@/server/auth/session";
import { StudioHeader, StudioSection } from "@/components/studio/page-header";
import { SecurityPanel } from "@/components/studio/security-panel";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Security" };

function device(ua: string | null) {
  if (!ua) return "Unknown device";
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac OS/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "Device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Browser";
  return `${browser} on ${os}`;
}

export default async function SecurityPage() {
  const user = await requireStaff();
  const h = await headers();
  const [current, sessions, logins] = await Promise.all([
    auth.api.getSession({ headers: h }),
    db.select().from(schema.sessions).where(eq(schema.sessions.userId, user.id)).orderBy(desc(schema.sessions.updatedAt)),
    db.select().from(schema.loginEvents).where(eq(schema.loginEvents.userId, user.id)).orderBy(desc(schema.loginEvents.createdAt)).limit(15),
  ]);
  const labels: Record<string, string> = { sign_in: "Signed in", sign_in_failed: "Failed sign-in attempt", password_changed: "Password changed", sign_out: "Signed out" };
  return (
    <>
      <StudioHeader title="Security" description="Your sign-in, devices and recent account activity." />
      <StudioSection>
        <SecurityPanel sessions={sessions.filter((s) => s.expiresAt > new Date()).map((s) => ({ token: s.token, current: s.token === current?.session.token, device: device(s.userAgent), lastActive: formatDateTime(s.updatedAt) }))} />
      </StudioSection>
      <StudioSection title="Recent sign-ins">
        <ul className="divide-y divide-rule rounded-[var(--radius-l)] border border-rule bg-surface">
          {logins.map((l) => (
            <li key={l.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-step-n1">
              <span className={l.event === "sign_in_failed" ? "text-danger" : ""}>{labels[l.event] ?? l.event}</span>
              <span className="text-step-n2 text-ink-muted">{device(l.userAgent)} · {formatDateTime(l.createdAt)}</span>
            </li>
          ))}
          {!logins.length && <li className="px-4 py-3 text-step-n1 text-ink-soft">No sign-ins recorded yet.</li>}
        </ul>
      </StudioSection>
    </>
  );
}
