import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ListingSkeleton, PageIntro, StoryListing, parseListParams } from "@/components/story/story-listing";
import { getCategories } from "@/server/content/public";

export const metadata: Metadata = {
  title: "All stories",
  description: "Every story, poem and reflection published on Inkinspire, newest first.",
  alternates: { canonical: "/stories" },
};

export default function StoriesPage({ searchParams }: PageProps<"/stories">) {
  return (
    <>
      <PageIntro eyebrow="The archive" title="All stories" description="Every story, poem and reflection, newest first. Filter by theme, or by what’s free to read.">
        <Suspense>
          <CategoryLinks />
        </Suspense>
      </PageIntro>
      <div className="container-ink py-10 md:py-14">
        <Suspense fallback={<ListingSkeleton />}>
          <Listing searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Listing({ searchParams }: Pick<PageProps<"/stories">, "searchParams">) {
  const params = parseListParams(await searchParams);
  return <StoryListing basePath="/stories" query={{}} params={params} />;
}

async function CategoryLinks() {
  const cats = await getCategories();
  return (
    <nav aria-label="Themes" className="mt-8 flex flex-wrap gap-2">
      {cats.map((c) => (
        <Link
          key={c.slug}
          href={`/category/${c.slug}`}
          className="inline-flex min-h-10 items-center rounded-full px-4 text-step-n1 font-medium transition-opacity hover:opacity-80"
          style={{ background: `var(--cat-${c.colour}-bg)`, color: `var(--cat-${c.colour}-ink)` }}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
