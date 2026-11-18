"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

/** Browser-side auth calls. The session itself lives in an HttpOnly cookie the page cannot read. */
export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
});

/** Non-sensitive hint so cached pages can show "Your account" without a server round-trip. */
export function setSignedInHint(on: boolean) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = on ? `ink_hint=1; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}` : `ink_hint=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

/** Only allow same-site relative redirects after sign-in (no open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** Plain-language messages for Better Auth error codes. */
export function authMessage(error: { code?: string; message?: string; status?: number } | null | undefined): string {
  if (!error) return "Something went wrong. Please try again.";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don’t match. Please try again, or reset your password.";
    case "EMAIL_NOT_VERIFIED":
      return "Please confirm your email first. We’ve just sent you a fresh link.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "We couldn’t create an account with that email. If it’s yours, try signing in or resetting your password.";
    case "INVALID_TOKEN":
      return "This link has expired or has already been used. Please request a new one.";
    case "INVALID_CODE":
    case "INVALID_TWO_FACTOR_COOKIE":
      return "That code didn’t work. Codes change every 30 seconds; please try the newest one.";
    case "PASSWORD_COMPROMISED":
      return error.message ?? "This password has appeared in a data breach. Please choose another.";
  }
  if (error.status === 429) return error.message ?? "Too many attempts. Please wait a few minutes and try again.";
  return error.message ?? "Something went wrong. Please try again.";
}
