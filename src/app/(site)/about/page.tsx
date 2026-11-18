import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/server/content/pages";
import { NewsletterForm } from "@/components/site/newsletter-form";

export async function generateMetadata(): Promise<Metadata> {
  const p = await getPage("about");
  return { title: p?.title ?? "About", description: p?.seoDescription ?? undefined, alternates: { canonical: "/about" } };
}

export default async function AboutPage() {
  const page = await getPage("about");
  if (!page) notFound();
  return (
    <article>
      <header className="grain border-b border-rule">
        <div className="container-ink py-14 text-center md:py-24">
          <p className="eyebrow">About</p>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-step-6 leading-[1] tracking-[-0.025em]" style={{ fontVariationSettings: '"opsz" 144' }}>
            {page.title}
          </h1>
        </div>
      </header>
      <div className="container-ink py-12 md:py-16">
        <div className="prose-ink mx-auto" dangerouslySetInnerHTML={{ __html: page.html }} />
        <div className="mx-auto mt-16 max-w-[var(--measure)] rounded-[var(--radius-l)] bg-sunken p-6 md:p-8">
          <p className="font-display text-step-2">Read along.</p>
          <p className="mt-2 font-reading text-step-0 text-ink-soft">Get each new story by email, the moment it’s published.</p>
          <NewsletterForm source="newsletter-page" className="mt-5" />
        </div>
      </div>
    </article>
  );
}
