import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListingSkeleton, StoryListing, parseListParams } from "@/components/story/story-listing";
import { getAuthor, getAuthors } from "@/server/content/public";
import { SocialLinks } from "@/components/site/social-links";
import { JsonLd, siteUrl } from "@/components/seo/json-ld";
import { plural } from "@/lib/format";

export async function generateStaticParams() {
  return (await getAuthors()).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/authors/[slug]">): Promise<Metadata> {
  const a = await getAuthor((await params).slug);
  if (!a) return { title: "Author not found", robots: { index: false } };
  return { title: a.name, description: a.tagline ?? a.bio?.slice(0, 155), alternates: { canonical: `/authors/${a.slug}` } };
}

export default async function AuthorPage({ params, searchParams }: PageProps<"/authors/[slug]">) {
  const { slug } = await params;
  const a = await getAuthor(slug);
  if (!a) notFound();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: a.name,
          description: a.bio ?? undefined,
          url: `${siteUrl()}/authors/${a.slug}`,
          sameAs: Object.values(a.socials).filter((v) => v?.startsWith("http")),
        }}
      />
      <header className="grain border-b border-rule">
        <div className="container-ink grid items-center gap-8 py-12 md:grid-cols-12 md:py-20">
          <div className="md:col-span-3">
            <div className="mx-auto aspect-square w-40 overflow-hidden rounded-full bg-sunken md:w-full md:max-w-[15rem]">
              {a.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- pre-generated variants
                <img src={a.photo.src} srcSet={a.photo.srcSet} sizes="240px" alt={a.photo.alt} className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden className="flex h-full w-full items-center justify-center font-display text-[6rem] text-accent italic">
                  {a.name.charAt(0)}
                </span>
              )}
            </div>
          </div>
          <div className="md:col-span-8 md:col-start-5">
            <p className="eyebrow mb-3">Author · {plural(a.storyCount, "story", "stories")}</p>
            <h1 className="font-display text-step-5 leading-[1.04]">{a.name}</h1>
            {a.tagline && <p className="mt-3 font-reading text-step-2 text-ink-soft italic">{a.tagline}</p>}
            {a.bio && <p className="mt-5 max-w-[60ch] font-reading text-step-1 leading-relaxed">{a.bio}</p>}
            <SocialLinks socials={a.socials} className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-step-n1" />
          </div>
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

async function Listing({ slug, searchParams }: { slug: string; searchParams: PageProps<"/authors/[slug]">["searchParams"] }) {
  return <StoryListing basePath={`/authors/${slug}`} query={{ author: slug }} params={parseListParams(await searchParams)} />;
}
