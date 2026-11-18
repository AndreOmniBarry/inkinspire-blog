"use client";

import { useEffect } from "react";
import { setSignedInHint } from "@/lib/auth-client";

/** After verification Better Auth signs the reader in; reflect that in the header hint cookie. */
export function VerifiedHint() {
  useEffect(() => setSignedInHint(true), []);
  return null;
}
