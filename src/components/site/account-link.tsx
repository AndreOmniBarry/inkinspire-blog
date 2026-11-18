"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

/**
 * Header account link without a server round-trip: a non-sensitive hint cookie (`ink_hint=1`)
 * is set at sign-in and cleared at sign-out. The real session cookie is HttpOnly and never read here.
 */
function subscribe() {
  return () => {};
}
const signedIn = () => document.cookie.split("; ").some((c) => c === "ink_hint=1");

export function AccountLink({ className }: { className?: string }) {
  const isIn = useSyncExternalStore(subscribe, signedIn, () => false);
  return (
    <Link href={isIn ? "/account" : "/login"} className={className} prefetch={false}>
      {isIn ? "Your account" : "Sign in"}
    </Link>
  );
}
