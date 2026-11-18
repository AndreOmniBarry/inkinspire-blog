import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListingSkeleton, StoryListing, parseListParams } from "@/components/story/story-listing";
import { getCategories, getCategory } from "@/server/content/public";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { plural } from "@/lib/format";

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const c = await getCategory((await params).slug);
  if (!c) return { title: "Theme not found", robots: { index: false } };
  return {
    title: c.seoTitle ?? c.name,
    description: c.seoDescription ?? c.description ?? `Stories about ${c.name.toLowerCase()} on Inkinspire.`,
    alternates: { canonical: `/category/${c.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Stories", path: "/stories" }, { name: category.name, path: `/category/${slug}` }])} />
      <header className="grain border-b border-rule" style={{ background: `var(--cat-${category.colour}-bg)`, color: `var(--cat-${category.colour}-ink)` }}>
        <div className="container-ink py-12 md:py-20">
          <p className="font-ui text-step-n2 font-semibold tracking-[0.16em] uppercase opacity-80">A theme · {plural(category.storyCount, "story", "stories")}</p>
          <h1 className="mt-4 max-w-4xl font-display text-step-5 leading-[1.04] tracking-[-0.02em]" style={{ fontVariationSettings: '"opsz" 144' }}>
            {category.name}
          </h1>
          {category.description && <p className="mt-5 max-w-[48ch] font-reading text-step-1 leading-relaxed opacity-90">{category.description}</p>}
        </div>
      </header>
      <div className="container-ink py-10 md:py-14">
        <Suspense fallback={<ListingSkeleton />}>
          <Listing slug={slug} searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Listing({ slug, searchParams }: { slug: string; searchParams: PageProps<"/category/[slug]">["searchParams"] }) {
  return <StoryListing basePath={`/category/${slug}`} query={{ category: slug }} params={parseListParams(await searchParams)} />;
}
