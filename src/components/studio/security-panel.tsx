"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient, authMessage } from "@/lib/auth-client";
import { revokeSession } from "@/app/studio/actions/account";
import { passwordProblem } from "@/lib/password-policy";
import { PasswordInput } from "@/components/auth/password-input";

export function SecurityPanel({ sessions }: { sessions: Array<{ token: string; current: boolean; device: string; lastActive: string }> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const changePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const next = String(f.get("next"));
    const p = passwordProblem(next);
    if (p) return setErr(p);
    const { error } = await authClient.changePassword({ currentPassword: String(f.get("current")), newPassword: next, revokeOtherSessions: true });
    if (error) return setErr(authMessage(error));
    setErr(null);
    setMsg("Password changed. You’ve been signed out on your other devices.");
    e.currentTarget.reset();
    router.refresh();
  };
  const newCodes = async () => {
    const password = window.prompt("To make new recovery codes, confirm your password:");
    if (!password) return;
    const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
    if (error) return setErr(authMessage(error));
    setCodes(data?.backupCodes ?? null);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-l)] border border-rule bg-surface p-5 md:p-7">
        <h2 className="font-display text-step-2">Signed-in devices</h2>
        <ul className="mt-4 divide-y divide-rule">
          {sessions.map((s) => (
            <li key={s.token} className="flex items-center gap-3 py-3">
              <div className="flex-1"><p className="font-semibold">{s.device}{s.current && <span className="ml-2 rounded-full bg-sunken px-2 py-0.5 text-step-n2">This device</span>}</p><p className="text-step-n2 text-ink-muted">Last active {s.lastActive}</p></div>
              {!s.current && <button type="button" disabled={pending} onClick={() => start(async () => { await revokeSession(s.token); router.refresh(); })} className="share-pill">Sign out</button>}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-[var(--radius-l)] border border-rule bg-surface p-5 md:p-7">
        <h2 className="font-display text-step-2">Two-step verification</h2>
        <p className="mt-1 text-step-n1 text-ink-soft">On. If you lose your phone, sign in with a recovery code, then make new ones here.</p>
        <button type="button" onClick={newCodes} className="mt-4 min-h-11 rounded-full border border-rule-strong px-5 text-step-n1 font-semibold">Make new recovery codes</button>
        {codes && (
          <div className="mt-4">
            <p className="text-step-n1 font-semibold">Your new codes (the old ones no longer work):</p>
            <ul className="mt-2 grid grid-cols-2 gap-2 rounded bg-sunken p-4 font-mono">{codes.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        )}
      </section>
      <section className="rounded-[var(--radius-l)] border border-rule bg-surface p-5 md:p-7">
        <h2 className="font-display text-step-2">Change password</h2>
        <form onSubmit={changePassword} className="mt-4 max-w-md space-y-4">
          <div><label htmlFor="sec-current" className="mb-1.5 block text-step-n1 font-semibold">Current password</label><PasswordInput id="sec-current" name="current" autoComplete="current-password" /></div>
          <div><label htmlFor="sec-next" className="mb-1.5 block text-step-n1 font-semibold">New password</label><PasswordInput id="sec-next" name="next" autoComplete="new-password" showStrength /></div>
          <button type="submit" className="min-h-11 rounded-full bg-accent px-6 font-semibold text-on-accent">Change password</button>
        </form>
      </section>
      <p role="status" className={err ? "text-danger" : "text-success"}>{err ?? msg}</p>
    </div>
  );
}
