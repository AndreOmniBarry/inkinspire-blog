"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient, authMessage, safeNext } from "@/lib/auth-client";
import { passwordProblem } from "@/lib/password-policy";
import { AuthCard, Field, FormError, SubmitButton } from "./ui";
import { PasswordInput } from "./password-input";

export function RegisterForm() {
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const errs: Record<string, string> = {};
    if (name.length < 2) errs.name = "Please tell us your name.";
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = "Please enter a valid email address.";
    const pw = passwordProblem(password);
    if (pw) errs.password = pw;
    if (!f.get("terms")) errs.terms = "Please agree to the terms and privacy policy to continue.";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setPending(true);
    setError(null);
    const next = safeNext(params.get("next"), "/account");
    const { error } = await authClient.signUp.email({ name, email, password, callbackURL: `/verify-email?verified=1&next=${encodeURIComponent(next)}` });
    setPending(false);
    if (error) return setError(authMessage(error));
    setSentTo(email);
  };

  if (sentTo) {
    return (
      <AuthCard title="Check your inbox" intro={<>We’ve sent a link to <strong className="text-ink">{sentTo}</strong>. Tap it to confirm your email and finish creating your account. It works for one hour.</>}>
        <p className="text-step-n1 text-ink-soft">Nothing there? Check your spam or promotions folder. You can request a new link from the sign-in page.</p>
        <Link href="/login" className="mt-6 inline-flex min-h-11 items-center font-semibold text-accent underline-offset-4 hover:underline">
          Go to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your free account"
      intro="Save stories for later, pick up where you left off, and set the page the way you like to read."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-accent underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <FormError message={error} />
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field id="name" label="Your name" error={fieldErrors.name}>
          <input id="name" name="name" autoComplete="name" required className="field" aria-invalid={!!fieldErrors.name || undefined} aria-describedby={fieldErrors.name ? "name-error" : undefined} />
        </Field>
        <Field id="email" label="Email address" error={fieldErrors.email}>
          <input id="email" name="email" type="email" autoComplete="email" required className="field" aria-invalid={!!fieldErrors.email || undefined} aria-describedby={fieldErrors.email ? "email-error" : undefined} />
        </Field>
        <Field id="password" label="Choose a password" error={fieldErrors.password}>
          <PasswordInput id="password" name="password" autoComplete="new-password" showStrength invalid={!!fieldErrors.password} describedBy={fieldErrors.password ? "password-error" : undefined} />
        </Field>
        <div>
          <label className="flex items-start gap-3 text-step-n1">
            <input type="checkbox" name="terms" className="mt-0.5 size-4 accent-[var(--accent)]" aria-invalid={!!fieldErrors.terms || undefined} />
            <span>
              I agree to the{" "}
              <Link href="/legal/terms" className="underline" target="_blank">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="underline" target="_blank">
                privacy policy
              </Link>
              .
            </span>
          </label>
          {fieldErrors.terms && <p className="mt-1.5 text-step-n1 text-danger">{fieldErrors.terms}</p>}
        </div>
        <SubmitButton pending={pending}>{pending ? "Creating your account…" : "Create account"}</SubmitButton>
      </form>
    </AuthCard>
  );
}
