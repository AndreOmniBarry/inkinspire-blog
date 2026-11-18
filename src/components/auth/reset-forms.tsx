"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient, authMessage } from "@/lib/auth-client";
import { passwordProblem } from "@/lib/password-policy";
import { AuthCard, Field, FormError, SubmitButton } from "./ui";
import { PasswordInput } from "./password-input";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({
      email: String(new FormData(e.currentTarget).get("email")),
      redirectTo: "/reset-password",
    });
    setPending(false);
    // Same message whether or not the account exists (no account enumeration).
    if (error && error.status === 429) return setError(authMessage(error));
    setSent(true);
  };
  if (sent)
    return (
      <AuthCard title="Check your inbox" intro="If there’s an account with that email, we’ve sent a link to choose a new password. It works once, for one hour.">
        <Link href="/login" className="font-semibold text-accent underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </AuthCard>
    );
  return (
    <AuthCard title="Forgotten your password?" intro="Enter your email and we’ll send you a link to choose a new one." footer={<Link href="/login" className="font-semibold text-accent hover:underline">Back to sign in</Link>}>
      <FormError message={error} />
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field id="email" label="Email address">
          <input id="email" name="email" type="email" autoComplete="email" required className="field" autoFocus />
        </Field>
        <SubmitButton pending={pending}>{pending ? "Sending…" : "Send reset link"}</SubmitButton>
      </form>
    </AuthCard>
  );
}

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") ? authMessage({ code: "INVALID_TOKEN" }) : null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  if (!token)
    return (
      <AuthCard title="This link has expired" intro="Reset links work once, for one hour. Please request a new one.">
        <Link href="/forgot-password" className="font-semibold text-accent underline-offset-4 hover:underline">
          Request a new link
        </Link>
      </AuthCard>
    );
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pw = String(f.get("password") ?? "");
    const problem = passwordProblem(pw);
    if (problem) return setFieldError(problem);
    if (pw !== String(f.get("confirm") ?? "")) return setFieldError("The two passwords don’t match.");
    setFieldError(null);
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword: pw, token });
    setPending(false);
    if (error) return setError(authMessage(error));
    router.replace("/login?reset=1" as never);
  };
  return (
    <AuthCard title="Choose a new password" intro="For your security, you’ll be signed out everywhere else.">
      <FormError message={error} />
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field id="password" label="New password" error={fieldError}>
          <PasswordInput id="password" name="password" autoComplete="new-password" showStrength invalid={!!fieldError} describedBy={fieldError ? "password-error" : undefined} />
        </Field>
        <Field id="confirm" label="Type it again">
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="field" />
        </Field>
        <SubmitButton pending={pending}>{pending ? "Saving…" : "Save new password"}</SubmitButton>
      </form>
    </AuthCard>
  );
}
