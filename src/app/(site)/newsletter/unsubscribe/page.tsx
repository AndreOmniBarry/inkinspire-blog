import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { unsubscribeAction } from "@/app/actions/unsubscribe";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

export default function UnsubscribePage({ searchParams }: PageProps<"/newsletter/unsubscribe">) {
  return (
    <div className="container-ink py-20 text-center md:py-28">
      <Suspense>
        <Body searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Body({ searchParams }: Pick<PageProps<"/newsletter/unsubscribe">, "searchParams">) {
  const sp = await searchParams;
  if (sp.done === "1")
    return (
      <>
        <h1 className="font-display text-step-5">You’ve been unsubscribed.</h1>
        <p className="mx-auto mt-4 max-w-[44ch] font-reading text-step-1 text-ink-soft">You won’t receive any more newsletters. The stories are still here whenever you want them.</p>
        <Link href="/" className="mt-8 inline-flex min-h-12 items-center rounded-full border border-rule-strong px-6 font-semibold hover:border-ink">Back to Inkinspire</Link>
      </>
    );
  if (sp.done === "0" || !sp.token)
    return (
      <>
        <h1 className="font-display text-step-5">We couldn’t find that subscription.</h1>
        <p className="mx-auto mt-4 max-w-[44ch] font-reading text-step-1 text-ink-soft">It may already be unsubscribed. If you’re still receiving emails, write to us and we’ll sort it out.</p>
        <Link href="/contact" className="mt-8 inline-flex min-h-12 items-center rounded-full border border-rule-strong px-6 font-semibold">Contact us</Link>
      </>
    );
  return (
    <>
      <h1 className="font-display text-step-5">Unsubscribe from Inkinspire?</h1>
      <p className="mx-auto mt-4 max-w-[44ch] font-reading text-step-1 text-ink-soft">You’ll stop receiving the newsletter. You can subscribe again at any time.</p>
      <form action={unsubscribeAction} className="mt-8">
        <input type="hidden" name="token" value={String(sp.token)} />
        <button type="submit" className="inline-flex min-h-12 items-center rounded-full bg-accent px-7 font-semibold text-on-accent hover:bg-accent-hover">
          Unsubscribe me
        </button>
      </form>
    </>
  );
}
