import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main id="main" className="grain flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Link href="/" aria-label="Inkinspire, home" className="text-ink">
        <Logo height={30} />
      </Link>
      <p className="mt-16 font-display text-[clamp(5rem,18vw,10rem)] leading-none text-accent italic" aria-hidden>
        404
      </p>
      <h1 className="mt-6 font-display text-step-4">This page has wandered off.</h1>
      <p className="mx-auto mt-4 max-w-[42ch] font-reading text-step-1 text-ink-soft">
        Perhaps it was moved, or perhaps it was never written. Either way, there are plenty of stories that are exactly where they should be.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/stories" className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-semibold text-on-accent hover:bg-accent-hover">
          Browse stories
        </Link>
        <Link href="/search" className="inline-flex min-h-12 items-center rounded-full border border-rule-strong px-6 font-semibold hover:border-ink">
          Search
        </Link>
      </div>
    </main>
  );
}
