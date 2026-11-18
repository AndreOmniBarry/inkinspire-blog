import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "@/server/db";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = {
  title: "Membership",
  description: "Become an Inkinspire member: read every story, including exclusive essays, letters and collections.",
  alternates: { canonical: "/membership" },
};

async function getPlans() {
  "use cache";
  cacheTag("plans");
  cacheLife("hours");
  return db.select().from(schema.plans).where(eq(schema.plans.active, true)).orderBy(asc(schema.plans.position));
}

const benefits = [
  ["Every story, in full", "Read all members-only stories, reflections and letters, the moment they’re published."],
  ["Special collections", "Curated series like Letters to My Younger Self, and members-only literary collections."],
  ["Members’ letters", "Selected newsletters written only for members."],
  ["Independent writing", "Your membership keeps Inkinspire unhurried, advertising-free and fully independent."],
];

export default async function MembershipPage() {
  const plans = await getPlans();
  return (
    <>
      <header className="grain border-b border-rule">
        <div className="container-ink py-14 text-center md:py-24">
          <p className="eyebrow text-gilt-ink">Membership</p>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-step-6 leading-[1] tracking-[-0.025em]" style={{ fontVariationSettings: '"opsz" 144' }}>
            Keep the stories coming.
          </h1>
          <p className="mx-auto mt-6 max-w-[48ch] font-reading text-step-1 leading-relaxed text-ink-soft">
            Most of Inkinspire is free, and always will be. Members read everything, and make it possible for the writing to continue.
          </p>
        </div>
      </header>
      <div className="container-ink py-14 md:py-20">
        <ul className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
          {benefits.map(([t, d]) => (
            <li key={t} className="rounded-[var(--radius-l)] border border-rule bg-surface p-6">
              <p className="font-display text-step-2">{t}</p>
              <p className="mt-2 font-reading text-step-0 leading-relaxed text-ink-soft">{d}</p>
            </li>
          ))}
        </ul>

        {plans.length > 0 ? (
          <section aria-labelledby="plans" className="mx-auto mt-16 max-w-4xl">
            <h2 id="plans" className="text-center font-display text-step-4">Choose a plan</h2>
            <ul className="mt-8 grid gap-6 md:grid-cols-2">
              {plans.map((p) => (
                <li key={p.id} className="flex flex-col rounded-[var(--radius-l)] border border-rule bg-surface p-7">
                  <p className="eyebrow">{p.interval === "yearly" ? "Yearly" : "Monthly"}</p>
                  <p className="mt-3 font-display text-step-2">{p.name}</p>
                  <p className="mt-4 font-display text-step-5 leading-none">
                    {formatMoney(p.amountMinor, p.currency)}
                    <span className="ml-1 font-ui text-step-0 text-ink-muted">/{p.interval === "yearly" ? "year" : "month"}</span>
                  </p>
                  {p.description && <p className="mt-4 font-reading text-step-0 text-ink-soft">{p.description}</p>}
                  <ul className="mt-5 space-y-2 text-step-n1">
                    {p.benefits.map((b) => (
                      <li key={b} className="flex gap-2">
                        <span aria-hidden className="text-gilt">✦</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/membership/checkout?plan=${p.slug}`} className="mt-auto inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 pt-0 font-semibold text-on-accent hover:bg-accent-hover">
                    Become a member
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section aria-labelledby="soon" className="mx-auto mt-16 max-w-2xl rounded-[var(--radius-l)] bg-ink px-6 py-12 text-center text-bg md:px-12">
            <p className="font-display text-step-2 text-gilt" aria-hidden>
              ❦
            </p>
            <h2 id="soon" className="mt-3 font-display text-step-4">
              Membership opens soon.
            </h2>
            <p className="mx-auto mt-4 max-w-[44ch] font-reading text-step-1 opacity-85">
              Subscribe to the newsletter and you’ll be the first to know, with a founding-member welcome when it opens.
            </p>
            <NewsletterForm source="newsletter-page" tone="inverse" className="mx-auto mt-8 max-w-lg text-left" />
          </section>
        )}
        <p className="mx-auto mt-10 max-w-2xl text-center text-step-n1 text-ink-muted">
          Payments are handled securely by Paystack; we never see your card details. Cancel any time. See the{" "}
          <Link href="/legal/subscription-terms" className="underline">subscription terms</Link> and{" "}
          <Link href="/legal/refunds" className="underline">refund policy</Link>.
        </p>
      </div>
    </>
  );
}
