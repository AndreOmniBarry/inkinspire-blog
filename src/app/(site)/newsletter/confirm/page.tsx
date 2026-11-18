import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { confirmSubscription } from "@/server/newsletter";

export const metadata: Metadata = { title: "Subscription confirmed", robots: { index: false } };

export default function ConfirmPage({ searchParams }: PageProps<"/newsletter/confirm">) {
  return (
    <div className="container-ink py-20 text-center md:py-28">
      <Suspense>
        <Result searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Result({ searchParams }: Pick<PageProps<"/newsletter/confirm">, "searchParams">) {
  const sp = await searchParams;
  const result = await confirmSubscription(String(sp.token ?? ""), typeof sp.s === "string" ? sp.s : null);
  return result === "confirmed" ? (
    <>
      <p className="ornament text-step-3" aria-hidden>❦</p>
      <h1 className="mt-6 font-display text-step-5">You’re subscribed.</h1>
      <p className="mx-auto mt-4 max-w-[42ch] font-reading text-step-1 text-ink-soft">Thank you. The next story will come straight to your inbox.</p>
      <Link href="/stories" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-semibold text-on-accent hover:bg-accent-hover">Read something now</Link>
    </>
  ) : (
    <>
      <h1 className="font-display text-step-5">This link has expired.</h1>
      <p className="mx-auto mt-4 max-w-[42ch] font-reading text-step-1 text-ink-soft">Confirmation links last 48 hours. Subscribe again and we’ll send a fresh one.</p>
      <Link href="/#main" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-semibold text-on-accent">Back to Inkinspire</Link>
    </>
  );
}
