"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="grain flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <p className="ornament text-step-3" aria-hidden>
        ❦
      </p>
      <h1 className="mt-6 font-display text-step-4">Something went wrong on our side.</h1>
      <p className="mx-auto mt-4 max-w-[44ch] font-reading text-step-1 text-ink-soft">
        It isn’t you. Please try again in a moment. If it keeps happening, let us know and we’ll fix it.
      </p>
      {error.digest && <p className="mt-3 font-ui text-step-n2 text-ink-muted">Reference: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-semibold text-on-accent hover:bg-accent-hover">
          Try again
        </button>
        <Link href="/" className="inline-flex min-h-12 items-center rounded-full border border-rule-strong px-6 font-semibold hover:border-ink">
          Go home
        </Link>
      </div>
    </main>
  );
}
