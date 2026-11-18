import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListingSkeleton, PageIntro, StoryListing, parseListParams } from "@/components/story/story-listing";
import { getCollection, getCollections } from "@/server/content/public";

export async function generateStaticParams() {
  return (await getCollections()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const c = await getCollection((await params).slug);
  if (!c) return { title: "Series not found", robots: { index: false } };
  return { title: c.name, description: c.description ?? undefined, alternates: { canonical: `/collections/${c.slug}` } };
}

export default async function CollectionPage({ params, searchParams }: PageProps<"/collections/[slug]">) {
  const { slug } = await params;
  const c = await getCollection(slug);
  if (!c) notFound();
  return (
    <>
      <PageIntro eyebrow="A series" title={c.name} description={c.description} />
      <div className="container-ink py-10 md:py-14">
        <Suspense fallback={<ListingSkeleton />}>
          <Listing slug={slug} searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Listing({ slug, searchParams }: { slug: string; searchParams: PageProps<"/collections/[slug]">["searchParams"] }) {
  const p = parseListParams(await searchParams);
  return <StoryListing basePath={`/collections/${slug}`} query={{ collection: slug }} params={{ ...p, sort: p.sort }} />;
}
