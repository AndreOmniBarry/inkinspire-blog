import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/ui";
import { VerifiedHint } from "@/components/auth/verified-hint";

export const metadata: Metadata = { title: "Email confirmed", robots: { index: false } };

export default function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  return (
    <Suspense>
      <Result searchParams={searchParams} />
    </Suspense>
  );
}

async function Result({ searchParams }: Pick<PageProps<"/verify-email">, "searchParams">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/account";
  if (sp.error) {
    return (
      <AuthCard title="This link has expired" intro="Confirmation links work for one hour. Sign in and we’ll send you a fresh one straight away.">
        <Link href="/login" className="font-semibold text-accent underline-offset-4 hover:underline">
          Go to sign in
        </Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="You’re all set." intro="Your email is confirmed and your account is ready. Welcome to Inkinspire.">
      <VerifiedHint />
      <div className="flex flex-wrap gap-3">
        <Link href={next as never} className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-semibold text-on-accent hover:bg-accent-hover">
          Continue
        </Link>
        <Link href="/stories" className="inline-flex min-h-12 items-center rounded-full border border-rule-strong px-6 font-semibold hover:border-ink">
          Browse stories
        </Link>
      </div>
    </AuthCard>
  );
}
