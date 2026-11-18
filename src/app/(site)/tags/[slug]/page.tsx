import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListingSkeleton, PageIntro, StoryListing, parseListParams } from "@/components/story/story-listing";
import { getTag } from "@/server/content/public";
import { db, schema } from "@/server/db";


/**
 * Addresses published after a deploy (new stories, themes, authors) render on first visit and are then
 * cached. `instant = false` lets that first render wait for the data instead of streaming a generic
 * shell, so unknown addresses get a real 404 and new ones work immediately.
 */
export const instant = false;

export async function generateStaticParams() {
  return db.select({ slug: schema.tags.slug }).from(schema.tags);
}

export async function generateMetadata({ params }: PageProps<"/tags/[slug]">): Promise<Metadata> {
  const t = await getTag((await params).slug);
  if (!t) return { title: "Tag not found", robots: { index: false } };
  return { title: `Stories tagged “${t.name}”`, alternates: { canonical: `/tags/${t.slug}` } };
}

export default async function TagPage({ params, searchParams }: PageProps<"/tags/[slug]">) {
  const { slug } = await params;
  const tag = await getTag(slug);
  if (!tag) notFound();
  return (
    <>
      <PageIntro eyebrow="Tagged" title={`#${tag.name.toLowerCase()}`} />
      <div className="container-ink py-10 md:py-14">
        <Suspense fallback={<ListingSkeleton />}>
          <Listing slug={slug} searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Listing({ slug, searchParams }: { slug: string; searchParams: PageProps<"/tags/[slug]">["searchParams"] }) {
  return <StoryListing basePath={`/tags/${slug}`} query={{ tag: slug }} params={parseListParams(await searchParams)} />;
}
