"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient, authMessage, safeNext, setSignedInHint } from "@/lib/auth-client";
import { AuthCard, Field, FormError, SubmitButton } from "./ui";
import { PasswordInput } from "./password-input";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"credentials" | "totp" | "backup">("credentials");
  const [error, setError] = useState<string | null>(params.get("error") === "INVALID_TOKEN" ? authMessage({ code: "INVALID_TOKEN" }) : null);
  const [pending, setPending] = useState(false);
  const [trust, setTrust] = useState(false);

  const finish = async () => {
    setSignedInHint(true);
    const next = params.get("next");
    if (next) return router.replace(safeNext(next) as never);
    const { data } = await authClient.getSession();
    const role = (data?.user as { role?: string } | undefined)?.role;
    router.replace((role && role !== "reader" ? "/studio" : "/account") as never);
    router.refresh();
  };

  const onCredentials = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { data, error } = await authClient.signIn.email({
      email: String(f.get("email")),
      password: String(f.get("password")),
      rememberMe: f.get("remember") === "on",
      callbackURL: safeNext(params.get("next")),
    });
    setPending(false);
    if (error) return setError(authMessage(error));
    if ((data as { twoFactorRedirect?: boolean })?.twoFactorRedirect) return setStep("totp");
    await finish();
  };

  const onCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s|-/g, "");
    setPending(true);
    setError(null);
    const res =
      step === "totp"
        ? await authClient.twoFactor.verifyTotp({ code, trustDevice: trust })
        : await authClient.twoFactor.verifyBackupCode({ code, trustDevice: trust });
    setPending(false);
    if (res.error) return setError(authMessage(res.error));
    await finish();
  };

  if (step !== "credentials") {
    return (
      <AuthCard
        title="Two-step verification"
        intro={
          step === "totp"
            ? "Open your authenticator app and enter the 6-digit code for Inkinspire."
            : "Enter one of the recovery codes you saved when you set up two-step verification. Each code works once."
        }
      >
        <FormError message={error} />
        <form onSubmit={onCode} className="space-y-5" noValidate>
          <Field id="code" label={step === "totp" ? "6-digit code" : "Recovery code"}>
            <input
              id="code"
              name="code"
              inputMode={step === "totp" ? "numeric" : "text"}
              autoComplete="one-time-code"
              pattern={step === "totp" ? "[0-9 ]*" : undefined}
              maxLength={step === "totp" ? 7 : 24}
              required
              autoFocus
              className="field text-center font-ui text-step-2 tracking-[0.3em]"
            />
          </Field>
          <label className="flex items-center gap-3 text-step-n1">
            <input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} className="size-4 accent-[var(--accent)]" />
            Trust this device for 30 days
          </label>
          <SubmitButton pending={pending}>{pending ? "Checking…" : "Verify and sign in"}</SubmitButton>
        </form>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setStep(step === "totp" ? "backup" : "totp");
          }}
          className="mt-5 text-step-n1 font-semibold text-accent underline-offset-4 hover:underline"
        >
          {step === "totp" ? "Lost your phone? Use a recovery code" : "Use my authenticator app instead"}
        </button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Welcome back"
      intro="Sign in to pick up where you left off, see your saved stories and manage your membership."
      footer={
        <>
          New to Inkinspire?{" "}
          <Link href={`/register${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`} className="font-semibold text-accent underline-offset-4 hover:underline">
            Create a free account
          </Link>
        </>
      }
    >
      <FormError message={error} />
      <form onSubmit={onCredentials} className="space-y-5" noValidate>
        <Field id="email" label="Email address">
          <input id="email" name="email" type="email" autoComplete="email" required className="field" autoFocus />
        </Field>
        <div>
          <Field id="password" label="Password">
            <PasswordInput id="password" name="password" autoComplete="current-password" />
          </Field>
          <div className="mt-2 flex items-center justify-between">
            <label className="flex items-center gap-2.5 text-step-n1">
              <input type="checkbox" name="remember" defaultChecked className="size-4 accent-[var(--accent)]" />
              Keep me signed in
            </label>
            <Link href="/forgot-password" className="text-step-n1 font-semibold text-accent underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        <SubmitButton pending={pending}>{pending ? "Signing in…" : "Sign in"}</SubmitButton>
      </form>
    </AuthCard>
  );
}
