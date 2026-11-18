import Link from "next/link";
import { clsx } from "clsx";
import type { StoryCard as Card } from "@/server/content/public";
import { formatDate, readingTime } from "@/lib/format";
import { Cover } from "./cover";
import { PremiumMark } from "./marks";

type Variant = "feature" | "standard" | "compact" | "list";

function Meta({ story, className }: { story: Card; className?: string }) {
  return (
    <p className={clsx("flex flex-wrap items-center gap-x-2 gap-y-1 font-ui text-step-n2 text-ink-muted", className)}>
      <time dateTime={story.date}>{formatDate(story.date)}</time>
      <span aria-hidden>·</span>
      <span>{readingTime(story.readingMinutes)}</span>
      {story.visibility === "premium" && (
        <>
          <span aria-hidden>·</span>
          <PremiumMark />
        </>
      )}
    </p>
  );
}

/**
 * One card, four editorial treatments. The whole card is one link (one tab stop), with the title as
 * its accessible name; category is a separate, quieter link.
 */
export function StoryCard({
  story,
  variant = "standard",
  priority = false,
  headingLevel = 3,
  className,
}: {
  story: Card;
  variant?: Variant;
  priority?: boolean;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const H = `h${headingLevel}` as "h2" | "h3";
  const href = `/stories/${story.slug}`;

  if (variant === "list") {
    return (
      <article className={clsx("group grid grid-cols-[1fr_6.5rem] gap-5 border-b border-rule py-6 sm:grid-cols-[1fr_10rem] sm:gap-8", className)}>
        <div className="min-w-0">
          {story.category && (
            <Link href={`/category/${story.category.slug}`} className="eyebrow relative z-10 hover:text-ink">
              {story.category.name}
            </Link>
          )}
          <H className="mt-2 font-display text-step-2 leading-tight">
            <Link href={href} className="after:absolute after:inset-0 group-hover:text-accent">
              {story.title}
            </Link>
          </H>
          {story.excerpt && <p className="mt-2 line-clamp-2 font-reading text-step-0 text-ink-soft">{story.excerpt}</p>}
          <Meta story={story} className="mt-3" />
        </div>
        <Cover
          cover={story.cover}
          title={story.title}
          colour={story.category?.colour}
          sizes="(min-width: 640px) 160px, 104px"
          ratio="1/1"
          size="sm"
          showTitle={false}
        />
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className={clsx("group relative", className)}>
        {story.category && <p className="eyebrow">{story.category.name}</p>}
        <H className="mt-1.5 font-display text-step-1 leading-snug">
          <Link href={href} className="after:absolute after:inset-0 group-hover:text-accent">
            {story.title}
          </Link>
        </H>
        <Meta story={story} className="mt-2" />
      </article>
    );
  }

  const feature = variant === "feature";
  return (
    <article className={clsx("group relative flex flex-col", className)}>
      <Cover
        cover={story.cover}
        title={story.title}
        category={story.category?.name}
        colour={story.category?.colour}
        sizes={feature ? "(min-width: 1024px) 60vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
        priority={priority}
        ratio={feature ? "16/10" : "3/2"}
        size={feature ? "lg" : "md"}
        className="card-lift"
      />
      <div className="mt-5 flex flex-1 flex-col">
        {story.category && (
          <Link href={`/category/${story.category.slug}`} className="eyebrow relative z-10 self-start hover:text-ink">
            {story.category.name}
          </Link>
        )}
        <H className={clsx("mt-2 font-display leading-[1.12]", feature ? "text-step-4" : "text-step-2")}>
          <Link href={href} className="after:absolute after:inset-0 group-hover:text-accent">
            {story.title}
          </Link>
        </H>
        {story.excerpt && (
          <p className={clsx("mt-3 font-reading text-ink-soft", feature ? "text-step-1 leading-relaxed" : "line-clamp-3 text-step-0")}>
            {story.excerpt}
          </p>
        )}
        <Meta story={story} className="mt-4" />
      </div>
    </article>
  );
}
