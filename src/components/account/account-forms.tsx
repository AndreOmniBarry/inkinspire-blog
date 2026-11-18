"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearHistory, deleteMyAccount, removeBookmark, updateProfile, type AccountState } from "@/app/actions/account";
import { authClient, authMessage, setSignedInHint } from "@/lib/auth-client";
import { passwordProblem } from "@/lib/password-policy";
import { PasswordInput } from "@/components/auth/password-input";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(updateProfile, {});
  return (
    <form action={action} className="max-w-md space-y-4">
      <div>
        <label htmlFor="acc-name" className="mb-1.5 block text-step-n1 font-semibold">Name</label>
        <input id="acc-name" name="name" defaultValue={name} className="field" />
      </div>
      <div>
        <p className="mb-1.5 text-step-n1 font-semibold">Email</p>
        <p className="text-step-0 text-ink-soft">{email}</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="min-h-11 rounded-full bg-accent px-6 font-semibold text-on-accent">{pending ? "Saving…" : "Save"}</button>
        <span role="status" className={state.error ? "text-danger" : "text-success"}>{state.error ?? state.message}</span>
      </div>
    </form>
  );
}

export function SavedList({ items }: { items: Array<{ id: string; slug: string; title: string; savedAt: string }> }) {
  const [list, setList] = useState(items);
  const [, start] = useTransition();
  if (!list.length) return <p className="text-step-0 text-ink-soft">Nothing saved yet. Tap “Save for later” on any story and it will wait for you here.</p>;
  return (
    <ul className="divide-y divide-rule rounded-[var(--radius-l)] border border-rule bg-surface">
      {list.map((s) => (
        <li key={s.id} className="flex items-center gap-3 px-4 py-3">
          <Link href={`/stories/${s.slug}`} className="flex-1 font-display text-step-1 hover:text-accent">{s.title}</Link>
          <span className="hidden text-step-n2 text-ink-muted sm:inline">Saved {s.savedAt}</span>
          <button
            type="button"
            onClick={() => start(async () => { await removeBookmark(s.id); setList((l) => l.filter((x) => x.id !== s.id)); })}
            className="share-pill"
            aria-label={`Remove “${s.title}” from saved`}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}

export function HistoryList({ items }: { items: Array<{ slug: string; title: string; progress: number; finished: boolean; lastRead: string }> }) {
  const [list, setList] = useState(items);
  const [, start] = useTransition();
  if (!list.length) return <p className="text-step-0 text-ink-soft">Stories you read while signed in will appear here, so you can find them again.</p>;
  return (
    <div>
      <ul className="divide-y divide-rule rounded-[var(--radius-l)] border border-rule bg-surface">
        {list.map((s) => (
          <li key={s.slug} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Link href={`/stories/${s.slug}`} className="flex-1 font-display text-step-1 hover:text-accent">{s.title}</Link>
              <span className="text-step-n2 text-ink-muted">{s.finished ? "Finished" : `${s.progress}% read`} · {s.lastRead}</span>
            </div>
            {!s.finished && (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={s.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.title}: ${s.progress}% read`}>
                <div className="h-full bg-gilt" style={{ width: `${s.progress}%` }} />
              </div>
            )}
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => window.confirm("Clear your reading history?") && start(async () => { await clearHistory(); setList([]); })} className="mt-3 text-step-n1 font-semibold text-ink-soft underline">
        Clear history
      </button>
    </div>
  );
}

export function PasswordAndSignOut() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const change = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const next = String(f.get("next"));
    const p = passwordProblem(next);
    if (p) return setErr(p);
    const { error } = await authClient.changePassword({ currentPassword: String(f.get("current")), newPassword: next, revokeOtherSessions: true });
    if (error) return setErr(authMessage(error));
    setErr(null);
    setMsg("Password changed. You’ve been signed out on your other devices.");
    form.reset();
  };
  const signOut = async () => {
    await authClient.signOut();
    setSignedInHint(false);
    router.replace("/");
    router.refresh();
  };
  return (
    <div className="space-y-6">
      <form onSubmit={change} className="max-w-md space-y-4">
        <div>
          <label htmlFor="pw-current" className="mb-1.5 block text-step-n1 font-semibold">Current password</label>
          <PasswordInput id="pw-current" name="current" autoComplete="current-password" />
        </div>
        <div>
          <label htmlFor="pw-next" className="mb-1.5 block text-step-n1 font-semibold">New password</label>
          <PasswordInput id="pw-next" name="next" autoComplete="new-password" showStrength />
        </div>
        <button type="submit" className="min-h-11 rounded-full border border-rule-strong px-6 font-semibold">Change password</button>
        <p role="status" className={err ? "text-danger" : "text-success"}>{err ?? msg}</p>
      </form>
      <button type="button" onClick={signOut} className="min-h-11 rounded-full bg-ink px-6 font-semibold text-bg">Sign out</button>
    </div>
  );
}

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<AccountState, FormData>(deleteMyAccount, {});
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-full border border-danger/60 px-5 font-semibold text-danger">
        Delete my account…
      </button>
    );
  }
  return (
    <form action={action} className="max-w-md space-y-4 rounded-[var(--radius-l)] border border-danger/50 p-5">
      <p className="text-step-n1">
        This permanently deletes your account, saved stories and reading history. Payment records are kept, without your name, because the law requires it. This can’t be undone.
      </p>
      <div>
        <label htmlFor="del-pw" className="mb-1.5 block text-step-n1 font-semibold">Your password</label>
        <input id="del-pw" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      <div>
        <label htmlFor="del-confirm" className="mb-1.5 block text-step-n1 font-semibold">Type DELETE to confirm</label>
        <input id="del-confirm" name="confirm" required className="field" autoComplete="off" />
      </div>
      {state.error && <p role="alert" className="text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="min-h-11 rounded-full bg-danger px-6 font-semibold text-surface">
          {pending ? "Deleting…" : "Delete my account"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 px-4 font-semibold text-ink-soft">Cancel</button>
      </div>
    </form>
  );
}
