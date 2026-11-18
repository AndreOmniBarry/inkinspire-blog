import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: { default: "Write", template: "%s · Inkinspire Studio" }, robots: { index: false, follow: false } };

/** The writing room: no sidebar, nothing but the page. */
export default function EditorLayout({ children }: LayoutProps<"/studio">) {
  return (
    <main id="main" className="min-h-dvh bg-bg">
      <Suspense fallback={<div className="mx-auto max-w-[var(--measure)] px-4 pt-24"><div className="h-14 w-3/4 animate-pulse rounded bg-sunken" /><div className="mt-10 space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-4 animate-pulse rounded bg-sunken" />)}</div></div>}>
        {children}
      </Suspense>
    </main>
  );
}
