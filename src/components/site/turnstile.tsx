"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile widget (managed, usually invisible). Renders nothing until the owner adds a
 * site key, so forms still work in development; the server falls back to honeypot + rate limits.
 */
export function Turnstile({ action }: { action: string }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
      <div className="cf-turnstile mt-3" data-sitekey={siteKey} data-action={action} data-appearance="interaction-only" data-theme="auto" />
    </>
  );
}

/** Hidden honeypot + timing fields. Every public form includes these. */
export function BotTrap() {
  const t = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (t.current) t.current.value = String(Date.now());
  }, []);
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
      <label>
        Leave this empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
      <input ref={t} type="hidden" name="_t" defaultValue="" />
    </div>
  );
}
