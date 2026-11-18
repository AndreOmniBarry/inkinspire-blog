"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, Download, ShieldCheck } from "lucide-react";
import { authClient, authMessage } from "@/lib/auth-client";
import { passwordProblem } from "@/lib/password-policy";
import { markPasswordChanged, recordTwoFactorEnabled, totpQr } from "@/app/studio/actions/account";
import { Field, FormError, SubmitButton } from "@/components/auth/ui";
import { PasswordInput } from "@/components/auth/password-input";

/**
 * First sign-in for every Studio account (brief §11): choose your own password, then turn on
 * two-step verification and save recovery codes. Nothing else in the Studio opens until both are done.
 */
export function WelcomeFlow({ name, mustChangePassword, twoFactorEnabled }: { name: string; mustChangePassword: boolean; twoFactorEnabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "2fa-start" | "2fa-scan" | "codes" | "done">(mustChangePassword ? "password" : twoFactorEnabled ? "done" : "2fa-start");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [savedCodes, setSavedCodes] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");

  const onPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const current = String(f.get("current") ?? "");
    const next = String(f.get("next") ?? "");
    const problem = passwordProblem(next);
    if (problem) return setError(problem);
    if (next !== String(f.get("confirm") ?? "")) return setError("The two new passwords don’t match.");
    if (next === current) return setError("Please choose a password different from the one you were given.");
    setPending(true);
    setError(null);
    const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
    if (error) {
      setPending(false);
      return setError(authMessage(error));
    }
    await markPasswordChanged();
    setCurrentPassword(next);
    setPending(false);
    setStep(twoFactorEnabled ? "done" : "2fa-start");
  };

  const onStart2fa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = currentPassword || String(new FormData(e.currentTarget).get("password") ?? "");
    setPending(true);
    setError(null);
    const { data, error } = await authClient.twoFactor.enable({ password, issuer: "Inkinspire" });
    if (error || !data || !("totpURI" in data)) {
      setPending(false);
      return setError(authMessage(error));
    }
    setCodes(data.backupCodes);
    setSecret(new URL(data.totpURI).searchParams.get("secret"));
    setQr(await totpQr(data.totpURI));
    setPending(false);
    setStep("2fa-scan");
  };

  const onVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
    setPending(true);
    setError(null);
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    setPending(false);
    if (error) return setError(authMessage(error));
    await recordTwoFactorEnabled();
    setStep("codes");
  };

  const codesText = `Inkinspire recovery codes for ${name}\nKeep these somewhere safe. Each code works once.\n\n${codes.join("\n")}\n`;

  return (
    <div className="mx-auto max-w-lg">
      <ol className="mb-8 flex items-center gap-3 text-step-n2 font-semibold tracking-[0.1em] uppercase" aria-label="Setup progress">
        {[
          ["Your password", step === "password"],
          ["Two-step verification", step.startsWith("2fa")],
          ["Recovery codes", step === "codes"],
        ].map(([label, active], i) => (
          <li key={String(label)} className={active ? "text-accent" : "text-ink-muted"} aria-current={active ? "step" : undefined}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>
      <div className="rounded-[var(--radius-l)] border border-rule bg-surface p-6 md:p-9">
        <FormError message={error} />
        {step === "password" && (
          <>
            <h1 className="font-display text-step-4">Welcome to the Studio, {name.split(" ")[0]}.</h1>
            <p className="mt-3 font-reading text-step-0 text-ink-soft">First, replace the temporary password you were given with one only you know.</p>
            <form onSubmit={onPassword} className="mt-7 space-y-5" noValidate>
              <Field id="current" label="Temporary password">
                <PasswordInput id="current" name="current" autoComplete="current-password" />
              </Field>
              <Field id="next" label="New password">
                <PasswordInput id="next" name="next" autoComplete="new-password" showStrength />
              </Field>
              <Field id="confirm" label="New password, again">
                <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="field" />
              </Field>
              <SubmitButton pending={pending}>{pending ? "Saving…" : "Save and continue"}</SubmitButton>
            </form>
          </>
        )}
        {step === "2fa-start" && (
          <>
            <ShieldCheck aria-hidden className="text-accent" size={32} strokeWidth={1.5} />
            <h1 className="mt-4 font-display text-step-4">Protect the publication</h1>
            <p className="mt-3 font-reading text-step-0 leading-relaxed text-ink-soft">
              Two-step verification means that even if someone learns your password, they can’t get into the Studio without your phone. You’ll need a free authenticator app such as Google Authenticator, Microsoft Authenticator or 1Password.
            </p>
            <form onSubmit={onStart2fa} className="mt-7 space-y-5" noValidate>
              {!currentPassword && (
                <Field id="password" label="Confirm your password">
                  <PasswordInput id="password" name="password" autoComplete="current-password" />
                </Field>
              )}
              <SubmitButton pending={pending}>{pending ? "Preparing…" : "Set up two-step verification"}</SubmitButton>
            </form>
          </>
        )}
        {step === "2fa-scan" && (
          <>
            <h1 className="font-display text-step-4">Scan this with your app</h1>
            <p className="mt-3 font-reading text-step-0 text-ink-soft">Open your authenticator app, choose “add account”, and point your camera at the code.</p>
            {qr && <div className="mx-auto mt-6 w-52 overflow-hidden rounded-[var(--radius-m)] border border-rule" role="img" aria-label="QR code for your authenticator app" dangerouslySetInnerHTML={{ __html: qr }} />}
            {secret && (
              <details className="mt-4 text-step-n1 text-ink-soft">
                <summary className="cursor-pointer font-semibold">Can’t scan? Type this key instead</summary>
                <code className="mt-2 block rounded bg-sunken p-3 font-mono text-step-n1 tracking-wider break-all text-ink">{secret.match(/.{1,4}/g)?.join(" ")}</code>
              </details>
            )}
            <form onSubmit={onVerify} className="mt-6 space-y-5" noValidate>
              <Field id="code" label="Enter the 6-digit code from the app">
                <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required className="field text-center font-ui text-step-2 tracking-[0.3em]" />
              </Field>
              <SubmitButton pending={pending}>{pending ? "Checking…" : "Turn on two-step verification"}</SubmitButton>
            </form>
          </>
        )}
        {step === "codes" && (
          <>
            <h1 className="font-display text-step-4">Save your recovery codes</h1>
            <p className="mt-3 font-reading text-step-0 leading-relaxed text-ink-soft">
              If you ever lose your phone, one of these codes will let you in. Each works once. Print them or keep them in a password manager, <strong className="text-ink">not</strong> in your email.
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-2 rounded-[var(--radius-m)] bg-sunken p-4 font-mono text-step-0">
              {codes.map((c) => (
                <li key={c} className="tracking-wider">{c}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="share-pill" onClick={async () => { await navigator.clipboard.writeText(codesText); setCopied(true); }}>
                {copied ? <Check aria-hidden size={15} /> : <Copy aria-hidden size={15} />} {copied ? "Copied" : "Copy"}
              </button>
              <a className="share-pill" download="inkinspire-recovery-codes.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(codesText)}`}>
                <Download aria-hidden size={15} /> Download
              </a>
            </div>
            <label className="mt-6 flex items-start gap-3 text-step-n1">
              <input type="checkbox" checked={savedCodes} onChange={(e) => setSavedCodes(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
              I’ve saved my recovery codes somewhere safe.
            </label>
            <button
              type="button"
              disabled={!savedCodes}
              onClick={() => { router.replace("/studio"); router.refresh(); }}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-50"
            >
              Open the Studio
            </button>
          </>
        )}
        {step === "done" && (
          <>
            <h1 className="font-display text-step-4">You’re all set.</h1>
            <button type="button" onClick={() => { router.replace("/studio"); router.refresh(); }} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 font-semibold text-on-accent">
              Open the Studio
            </button>
          </>
        )}
      </div>
    </div>
  );
}
