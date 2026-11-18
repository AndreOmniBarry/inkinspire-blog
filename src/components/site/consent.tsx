"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";

type Consent = { analytics: boolean; v: 1; at: string };
const COOKIE = "ink_consent";

function readConsent(): Consent | null {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw.slice(COOKIE.length + 1))) as Consent;
  } catch {
    return null;
  }
}

function writeConsent(analytics: boolean) {
  const value: Consent = { analytics, v: 1, at: new Date().toISOString() };
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax${secure}`;
  // Record the choice (NDPA/GDPR accountability). Fire-and-forget; no personal data beyond a hashed IP.
  navigator.sendBeacon?.("/api/consent", new Blob([JSON.stringify({ analytics })], { type: "application/json" }));
  return value;
}

/**
 * Granular cookie consent. Strictly necessary cookies (sign-in, preferences) need no consent.
 * Google Analytics 4 loads only after the reader says yes. "Cookie preferences" in the footer reopens it.
 */
export function ConsentBanner() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const [consent, setConsent] = useState<Consent | null>(null);
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const c = readConsent();
    /* eslint-disable react-hooks/set-state-in-effect -- cookie is only readable after hydration */
    setConsent(c);
    setAnalytics(!!c?.analytics);
    // Only ask when there is something optional to ask about.
    if (!c && gaId) setOpen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const reopen = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("[data-open-consent]")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("click", reopen);
    return () => document.removeEventListener("click", reopen);
  }, [gaId]);

  const choose = (a: boolean) => {
    setConsent(writeConsent(a));
    setAnalytics(a);
    setOpen(false);
  };

  return (
    <>
      {gaId && consent?.analytics && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="consent-title"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-[var(--radius-l)] border border-rule bg-surface p-5 shadow-[0_18px_50px_-20px_rgb(0_0_0/0.35)] motion-safe:animate-[fade-up_240ms_var(--ease-out)] sm:bottom-5 sm:p-6"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <h2 id="consent-title" className="font-display text-step-1">
            A note on cookies
          </h2>
          <p className="mt-2 text-step-n1 leading-relaxed text-ink-soft">
            We use essential cookies to keep you signed in and remember how you like to read. With your permission, we’d also use
            Google Analytics to understand which stories people read. Nothing is sold, ever.{" "}
            <Link href="/legal/cookies" className="underline">
              Cookie policy
            </Link>
          </p>
          <fieldset className="mt-4 space-y-2 text-step-n1">
            <legend className="sr-only">Cookie choices</legend>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked disabled className="mt-1 size-4 accent-[var(--accent)]" />
              <span>
                <strong className="font-semibold">Essential</strong>
                <span className="block text-ink-muted">Sign-in, security and your reading preferences. Always on.</span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1 size-4 accent-[var(--accent)]"
              />
              <span>
                <strong className="font-semibold">Analytics</strong>
                <span className="block text-ink-muted">Anonymous visit statistics via Google Analytics 4.</span>
              </span>
            </label>
          </fieldset>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => choose(true)} className="min-h-11 rounded-full bg-accent px-5 text-step-n1 font-semibold text-on-accent hover:bg-accent-hover">
              Accept all
            </button>
            <button type="button" onClick={() => choose(analytics)} className="min-h-11 rounded-full border border-rule-strong px-5 text-step-n1 font-semibold hover:border-ink">
              Save my choice
            </button>
            <button type="button" onClick={() => choose(false)} className="min-h-11 rounded-full px-4 text-step-n1 font-semibold text-ink-soft hover:text-ink">
              Essential only
            </button>
          </div>
        </section>
      )}
    </>
  );
}
