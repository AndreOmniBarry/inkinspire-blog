import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLegalSlugs, getPage } from "@/server/content/pages";
import { formatDate } from "@/lib/format";

export async function generateStaticParams() {
  return (await getLegalSlugs()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const p = await getPage((await params).slug);
  if (!p || p.kind !== "legal") return { title: "Not found", robots: { index: false } };
  return { title: p.title, description: p.seoDescription ?? undefined, alternates: { canonical: `/legal/${p.slug}` } };
}

const nav = [
  ["privacy", "Privacy"],
  ["terms", "Terms"],
  ["cookies", "Cookies"],
  ["copyright", "Copyright"],
  ["subscription-terms", "Subscription terms"],
  ["refunds", "Refunds & cancellation"],
];

export default async function LegalPage({ params }: PageProps<"/legal/[slug]">) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page || page.kind !== "legal") notFound();
  return (
    <div className="container-ink grid gap-10 py-12 md:grid-cols-12 md:py-16">
      <nav aria-label="Policies" className="md:col-span-3">
        <p className="eyebrow mb-3">Policies</p>
        <ul className="space-y-1 text-step-n1">
          {nav.map(([s, label]) => (
            <li key={s}>
              <Link
                href={`/legal/${s}`}
                aria-current={s === slug ? "page" : undefined}
                className="block rounded px-2 py-2 text-ink-soft hover:text-ink aria-[current=page]:bg-sunken aria-[current=page]:font-semibold aria-[current=page]:text-ink"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="md:col-span-8">
        <h1 className="font-display text-step-5 leading-tight">{page.title}</h1>
        <p className="mt-3 text-step-n1 text-ink-muted">Last updated {formatDate(page.updatedAt)}</p>
        <div className="prose-ink mt-8" dangerouslySetInnerHTML={{ __html: page.html }} />
      </article>
    </div>
  );
}
