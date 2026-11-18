import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAdjacentStories, getRelatedStories, getSitemapEntries, getStory } from "@/server/content/public";
import { getSiteSettings } from "@/server/settings";
import { Cover } from "@/components/story/cover";
import { PremiumMark } from "@/components/story/marks";
import { StoryCard } from "@/components/story/story-card";
import { ReadingProgress } from "@/components/article/reading-progress";
import { ReadingControls } from "@/components/article/reading-controls";
import { ShareBar } from "@/components/article/share-bar";
import { StoryActions } from "@/components/article/story-actions";
import { ContinuationSkeleton, MemberContinuation } from "@/components/article/member-continuation";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { JsonLd, breadcrumbJsonLd, siteUrl } from "@/components/seo/json-ld";
import { formatDate, readingTime } from "@/lib/format";

export async function generateStaticParams() {
  const { stories } = await getSitemapEntries();
  return stories.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/stories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStory(slug);
  if (!story) return { title: "Story not found", robots: { index: false } };
  const description = story.seoDescription ?? story.excerpt ?? story.subtitle ?? undefined;
  return {
    title: story.seoTitle ?? story.title,
    description,
    alternates: { canonical: story.canonicalUrl ?? `/stories/${story.slug}` },
    authors: story.authors.map((a) => ({ name: a.name, url: `/authors/${a.slug}` })),
    openGraph: {
      type: "article",
      title: story.seoTitle ?? story.title,
      description,
      url: `/stories/${story.slug}`,
      publishedTime: story.date,
      modifiedTime: story.updatedAt,
      section: story.category?.name,
      tags: story.tags.map((t) => t.name),
    },
    twitter: { card: "summary_large_image", title: story.seoTitle ?? story.title, description },
  };
}

export default async function StoryPage({ params }: PageProps<"/stories/[slug]">) {
  const { slug } = await params;
  const [story, settings] = await Promise.all([getStory(slug), getSiteSettings()]);
  if (!story) notFound();
  const [related, adjacent] = await Promise.all([getRelatedStories(story), getAdjacentStories(story.id)]);
  const url = `${siteUrl()}/stories/${story.slug}`;
  const author = story.authors[0];
  const premium = story.visibility === "premium";

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: story.title,
    description: story.seoDescription ?? story.excerpt ?? undefined,
    datePublished: story.date,
    dateModified: story.updatedAt,
    author: story.authors.map((a) => ({ "@type": "Person", name: a.name, url: `${siteUrl()}/authors/${a.slug}` })),
    publisher: { "@type": "Organization", name: settings.identity.name, logo: { "@type": "ImageObject", url: `${siteUrl()}/icon.svg` } },
    mainEntityOfPage: url,
    image: story.cover ? [story.cover.src.startsWith("http") ? story.cover.src : `${siteUrl()}${story.cover.src}`] : [`${url}/opengraph-image`],
    wordCount: story.wordCount,
    articleSection: story.category?.name,
    keywords: story.tags.map((t) => t.name).join(", ") || undefined,
    inLanguage: "en-GB",
    isAccessibleForFree: !premium,
    ...(premium ? { hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".members-only" } } : {}),
  };

  return (
    <article className="pb-8" data-story-id={story.id}>
      <JsonLd
        data={[
          articleLd,
          breadcrumbJsonLd([
            { name: "Stories", path: "/stories" },
            ...(story.category ? [{ name: story.category.name, path: `/category/${story.category.slug}` }] : []),
            { name: story.title, path: `/stories/${story.slug}` },
          ]),
        ]}
      />
      <ReadingProgress />

      {story.status === "archived" && (
        <div role="note" className="border-b border-rule bg-sunken">
          <p className="container-ink py-3 text-center text-step-n1 text-ink-soft">
            This story is from the archive. It is kept here so links to it keep working.
          </p>
        </div>
      )}

      <header className="container-ink pt-10 md:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <nav aria-label="Breadcrumb" className="eyebrow flex flex-wrap items-center justify-center gap-2" data-hide-in-focus>
            <Link href="/stories" className="hover:text-ink">
              Stories
            </Link>
            {story.category && (
              <>
                <span aria-hidden>/</span>
                <Link href={`/category/${story.category.slug}`} className="hover:text-ink">
                  {story.category.name}
                </Link>
              </>
            )}
          </nav>
          <h1 className="mt-6 font-display text-step-5 leading-[1.04] tracking-[-0.02em]" style={{ fontVariationSettings: '"opsz" 144' }}>
            {story.title}
          </h1>
          {story.subtitle && <p className="mx-auto mt-5 max-w-[42ch] font-reading text-step-2 leading-snug text-ink-soft italic">{story.subtitle}</p>}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-ui text-step-n1 text-ink-muted">
            {story.authors.map((a, i) => (
              <span key={a.slug}>
                {i > 0 && <span aria-hidden>& </span>}
                <Link href={`/authors/${a.slug}`} className="font-semibold text-ink hover:text-accent">
                  {a.name}
                </Link>
              </span>
            ))}
            <span aria-hidden>·</span>
            <time dateTime={story.date}>{formatDate(story.date)}</time>
            <span aria-hidden>·</span>
            <span>{readingTime(story.readingMinutes)}</span>
            {premium && (
              <>
                <span aria-hidden>·</span>
                <PremiumMark />
              </>
            )}
          </div>
          {story.collection && (
            <p className="mt-4 text-step-n1 text-ink-soft">
              Part of the series{" "}
              <Link href={`/collections/${story.collection.slug}`} className="font-semibold text-accent hover:underline">
                {story.collection.name}
              </Link>
            </p>
          )}
        </div>
      </header>

      {story.cover && (
        <figure className="container-ink mt-10 md:mt-14" data-hide-in-focus>
          <Cover cover={story.cover} title={story.title} sizes="(min-width: 1248px) 1184px, 100vw" priority ratio="16/9" className="mx-auto max-w-6xl" />
        </figure>
      )}

      <div className="container-ink mt-8 md:mt-12">
        <div className="mx-auto flex max-w-[var(--measure)] flex-wrap items-center justify-between gap-3 border-y border-rule py-3" data-hide-in-focus>
          <StoryActions postId={story.id} slug={story.slug} readingMinutes={story.readingMinutes} placement="top" />
          <ReadingControls />
        </div>

        <div id="story-body" className="mt-10 md:mt-12">
          <div className="prose-ink mx-auto" dangerouslySetInnerHTML={{ __html: story.previewHtml }} />
          {premium && (
            <div className="members-only">
              <Suspense fallback={<ContinuationSkeleton />}>
                <MemberContinuation postId={story.id} slug={story.slug} />
              </Suspense>
            </div>
          )}
        </div>

        <p className="ornament mx-auto mt-14 max-w-[var(--measure)] text-step-1" aria-hidden>
          ❦
        </p>

        <div className="mx-auto mt-10 max-w-[var(--measure)] space-y-8" data-hide-in-focus>
          {story.tags.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Tags">
              {story.tags.map((t) => (
                <li key={t.slug}>
                  <Link href={`/tags/${t.slug}`} className="inline-flex min-h-9 items-center rounded-full bg-sunken px-3.5 text-step-n1 text-ink-soft hover:text-ink">
                    #{t.name.toLowerCase()}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <StoryActions postId={story.id} slug={story.slug} readingMinutes={story.readingMinutes} placement="end" />
          <ShareBar url={url} title={story.title} />

          {author && (
            <section aria-label="About the author" className="flex gap-5 border-t border-rule pt-8">
              <div className="size-16 shrink-0 overflow-hidden rounded-full bg-sunken md:size-20">
                {author.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- pre-generated variants
                  <img src={author.photo.src} alt={author.photo.alt} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span aria-hidden className="flex h-full w-full items-center justify-center font-display text-step-3 text-accent italic">
                    {author.name.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <p className="eyebrow">Written by</p>
                <p className="mt-1 font-display text-step-2">
                  <Link href={`/authors/${author.slug}`} className="hover:text-accent">
                    {author.name}
                  </Link>
                </p>
                {author.bio && <p className="mt-2 font-reading text-step-0 leading-relaxed text-ink-soft">{author.bio}</p>}
              </div>
            </section>
          )}

          <section aria-label="Newsletter" className="rounded-[var(--radius-l)] bg-sunken p-6 md:p-8">
            <p className="font-display text-step-2">Stories like this, in your inbox.</p>
            <p className="mt-2 font-reading text-step-0 text-ink-soft">One email when something new is published. Nothing else.</p>
            <NewsletterForm source="article" className="mt-5" />
          </section>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="container-ink mt-20" data-hide-in-focus>
          <div className="mb-8 border-b border-rule pb-4">
            <p className="eyebrow mb-2">Keep reading</p>
            <h2 id="related-title" className="font-display text-step-3">
              You might also like
            </h2>
          </div>
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <StoryCard key={r.id} story={r} />
            ))}
          </div>
        </section>
      )}

      {(adjacent.older || adjacent.newer) && (
        <nav aria-label="More stories" className="container-ink mt-16 grid gap-4 sm:grid-cols-2" data-hide-in-focus>
          {adjacent.older ? (
            <Link href={`/stories/${adjacent.older.slug}`} className="group rounded-[var(--radius-m)] border border-rule p-5 hover:border-rule-strong">
              <span className="eyebrow">← Previous story</span>
              <span className="mt-2 block font-display text-step-1 group-hover:text-accent">{adjacent.older.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {adjacent.newer && (
            <Link href={`/stories/${adjacent.newer.slug}`} className="group rounded-[var(--radius-m)] border border-rule p-5 text-right hover:border-rule-strong">
              <span className="eyebrow">Next story →</span>
              <span className="mt-2 block font-display text-step-1 group-hover:text-accent">{adjacent.newer.title}</span>
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}
