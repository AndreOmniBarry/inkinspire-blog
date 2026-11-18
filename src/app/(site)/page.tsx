import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getHomepageLayout, type HomepageSection } from "@/server/content/homepage";
import {
  getCategories,
  getFeaturedStories,
  getLeadAuthor,
  getPopularStories,
  getStoriesByIds,
  listStories,
  type StoryCard as Card,
} from "@/server/content/public";
import { getSiteSettings } from "@/server/settings";
import { StoryCard } from "@/components/story/story-card";
import { Cover } from "@/components/story/cover";
import { PremiumMark } from "@/components/story/marks";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { ButtonLink } from "@/components/ui/button";
import { formatDate, plural, readingTime } from "@/lib/format";
import { JsonLd, websiteJsonLd, organizationJsonLd } from "@/components/seo/json-ld";

export default async function HomePage() {
  const [layout, settings] = await Promise.all([getHomepageLayout(), getSiteSettings()]);
  // Resolve the hand-picked sections in page order so no story appears twice.
  const used = new Set<string>();
  const heroSlot = layout.find((s) => s.section === "hero");
  const picksSlot = layout.find((s) => s.section === "editors_picks");
  let hero: Card | undefined;
  if (heroSlot) {
    hero = (await getStoriesByIds(heroSlot.postIds))[0] ?? (await getFeaturedStories(1))[0] ?? (await listStories({ page: 1 })).items[0];
    if (hero) used.add(hero.id);
  }
  let picks: Card[] = [];
  if (picksSlot) {
    picks = (await getStoriesByIds(picksSlot.postIds)).filter((p) => !used.has(p.id));
    if (picks.length < 3) {
      const more = (await getFeaturedStories(8)).filter((p) => !used.has(p.id) && !picks.some((x) => x.id === p.id));
      picks = [...picks, ...more].slice(0, 3);
    }
    picks.forEach((p) => used.add(p.id));
  }
  const latest = (await listStories({ page: 1 })).items.filter((p) => !used.has(p.id)).slice(0, 6);

  const total = (await listStories({ page: 1 })).total;
  return (
    <>
      <JsonLd data={[websiteJsonLd(settings), organizationJsonLd(settings)]} />
      <h1 className="sr-only">
        {settings.identity.name}: {settings.identity.tagline}
      </h1>
      {total === 0 && <EmptyHome />}
      {total > 0 &&
        layout.map((s) => {
          switch (s.section) {
            case "hero":
              return hero ? <Hero key={s.section} s={s} story={hero} /> : null;
            case "editors_picks":
              return picks.length ? <EditorsPicks key={s.section} s={s} picks={picks} /> : null;
            case "latest":
              return latest.length ? <Latest key={s.section} s={s} latest={latest} /> : null;
            case "popular":
              return <Popular key={s.section} s={s} />;
            case "categories":
              return <Categories key={s.section} s={s} />;
            case "author":
              return <AuthorIntro key={s.section} s={s} />;
            case "membership":
              return <MembershipInvite key={s.section} s={s} />;
            case "newsletter":
              return <NewsletterSection key={s.section} s={s} />;
            default:
              return null;
          }
        })}
    </>
  );
}

function SectionHeading({ eyebrow, title, href, linkLabel }: { eyebrow?: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6 border-b border-rule pb-4 md:mb-10">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="font-display text-step-3">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="group hidden shrink-0 items-center gap-1.5 text-step-n1 font-semibold text-ink-soft hover:text-ink sm:inline-flex">
          {linkLabel ?? "See all"} <ArrowRight aria-hidden size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function Hero({ s, story }: { s: HomepageSection; story: Card }) {
  return (
    <section aria-labelledby="hero-title" className="grain border-b border-rule">
      <div className="container-ink grid items-center gap-8 py-10 md:grid-cols-12 md:gap-12 md:py-16 lg:py-20">
        <div className="md:order-2 md:col-span-7">
          <Link href={`/stories/${story.slug}`} tabIndex={-1} aria-hidden className="block">
            <Cover
              cover={story.cover}
              title={story.title}
              category={story.category?.name}
              colour={story.category?.colour}
              sizes="(min-width: 768px) 58vw, 100vw"
              priority
              ratio="4/3"
              size="lg"
              showTitle={false}
              className="card-lift shadow-[0_30px_60px_-35px_rgb(0_0_0/0.35)]"
            />
          </Link>
        </div>
        <div className="md:order-1 md:col-span-5">
          <p className="eyebrow flex items-center gap-3">
            <span className="text-gilt-ink">{s.heading ?? "The featured story"}</span>
            {story.category && (
              <>
                <span aria-hidden className="h-px w-6 bg-rule-strong" />
                <Link href={`/category/${story.category.slug}`} className="hover:text-ink">
                  {story.category.name}
                </Link>
              </>
            )}
          </p>
          <h2 id="hero-title" className="mt-5 font-display text-step-5 leading-[1.02] tracking-[-0.02em]" style={{ fontVariationSettings: '"opsz" 144' }}>
            <Link href={`/stories/${story.slug}`} className="hover:text-accent">
              {story.title}
            </Link>
          </h2>
          {(story.subtitle || story.excerpt) && (
            <p className="mt-5 max-w-[34ch] font-reading text-step-1 leading-relaxed text-ink-soft">{story.subtitle ?? story.excerpt}</p>
          )}
          <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 font-ui text-step-n1 text-ink-muted">
            {story.author && <span className="font-semibold text-ink">{story.author.name}</span>}
            <span aria-hidden>·</span>
            <time dateTime={story.date}>{formatDate(story.date)}</time>
            <span aria-hidden>·</span>
            <span>{readingTime(story.readingMinutes)}</span>
            {story.visibility === "premium" && <PremiumMark className="ml-1" />}
          </p>
          <ButtonLink href={`/stories/${story.slug}`} size="lg" className="mt-8">
            Read the story
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function EditorsPicks({ s, picks }: { s: HomepageSection; picks: Card[] }) {
  return (
    <section aria-label={s.heading ?? "Editor’s picks"} className="container-ink pt-16 md:pt-24">
      <SectionHeading eyebrow="Chosen with care" title={s.heading ?? "Editor’s picks"} />
      <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {picks.map((p) => (
          <StoryCard key={p.id} story={p} />
        ))}
      </div>
    </section>
  );
}

function Latest({ s, latest }: { s: HomepageSection; latest: Card[] }) {
  return (
    <section aria-label={s.heading ?? "Latest stories"} className="container-ink pt-16 md:pt-24">
      <SectionHeading eyebrow="Newly published" title={s.heading ?? "Latest stories"} href="/stories" linkLabel="All stories" />
      <div className="grid gap-x-10 md:grid-cols-2">
        {latest.map((p) => (
          <StoryCard key={p.id} story={p} variant="list" />
        ))}
      </div>
      <div className="mt-8 sm:hidden">
        <ButtonLink href="/stories" variant="secondary" className="w-full">
          All stories
        </ButtonLink>
      </div>
    </section>
  );
}

async function Popular({ s }: { s: HomepageSection }) {
  const popular = await getPopularStories(5);
  if (!popular.length) return null;
  return (
    <section aria-label={s.heading ?? "Most read"} className="container-ink pt-16 md:pt-24">
      <div className="grid gap-10 rounded-[var(--radius-l)] border border-rule bg-surface p-6 md:grid-cols-12 md:p-10">
        <div className="md:col-span-4">
          <p className="eyebrow mb-2">What readers are finishing</p>
          <h2 className="font-display text-step-3">{s.heading ?? "Most read this month"}</h2>
          <p className="mt-4 font-reading text-step-0 text-ink-soft">Ranked by readers who read to the very end, not by clicks.</p>
        </div>
        <ol className="md:col-span-8">
          {popular.map((p, i) => (
            <li key={p.id} className="grid grid-cols-[2.5rem_1fr] items-baseline gap-4 border-b border-rule py-4 last:border-0">
              <span className="font-display text-step-3 text-gilt-ink tabular-nums" aria-hidden>
                {i + 1}
              </span>
              <StoryCard story={p} variant="compact" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

async function Categories({ s }: { s: HomepageSection }) {
  const cats = await getCategories();
  return (
    <section aria-label={s.heading ?? "Read by theme"} className="container-ink pt-16 md:pt-24">
      <SectionHeading eyebrow="Eight ways in" title={s.heading ?? "Read by theme"} />
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {cats.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/category/${c.slug}`}
              className="card-lift grain group flex h-full min-h-32 flex-col justify-between rounded-[var(--radius-m)] p-4 md:min-h-40 md:p-5"
              style={{ background: `var(--cat-${c.colour}-bg)`, color: `var(--cat-${c.colour}-ink)` }}
            >
              <span className="font-display text-step-1 leading-tight text-balance">{c.name}</span>
              <span className="mt-4 flex items-center justify-between font-ui text-step-n2 font-semibold tracking-[0.1em] uppercase opacity-85">
                {plural(c.storyCount, "story", "stories")}
                <ArrowRight aria-hidden size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function AuthorIntro({ s }: { s: HomepageSection }) {
  const author = await getLeadAuthor();
  if (!author) return null;
  return (
    <section aria-label={s.heading ?? "The storyteller"} className="container-ink pt-16 md:pt-24">
      <div className="grid items-center gap-8 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="relative mx-auto aspect-[4/5] max-w-xs overflow-hidden rounded-[var(--radius-l)] md:max-w-none">
            {author.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- pre-generated responsive variants
              <img src={author.photo.src} srcSet={author.photo.srcSet} sizes="(min-width: 768px) 30vw, 80vw" alt={author.photo.alt} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="grain flex h-full w-full items-center justify-center bg-sunken">
                <span className="font-display text-[7rem] leading-none text-accent italic" aria-hidden>
                  {author.name.charAt(0)}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-7 md:col-start-6">
          <p className="eyebrow mb-3">{s.heading ?? "The storyteller"}</p>
          <h2 className="font-display text-step-4 leading-tight">{author.name}</h2>
          {author.tagline && <p className="mt-2 font-reading text-step-1 text-ink-soft italic">{author.tagline}</p>}
          {author.bio && <p className="mt-5 max-w-[60ch] font-reading text-step-1 leading-relaxed">{author.bio}</p>}
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href={`/authors/${author.slug}`} variant="secondary">
              Read her stories
            </ButtonLink>
            <ButtonLink href="/about" variant="ghost">
              About Inkinspire
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function MembershipInvite({ s }: { s: HomepageSection }) {
  return (
    <section aria-label={s.heading ?? "Membership"} className="container-ink pt-16 md:pt-24">
      <div className="grain relative overflow-hidden rounded-[var(--radius-l)] bg-ink px-6 py-12 text-bg md:px-14 md:py-16">
        <span aria-hidden className="pointer-events-none absolute -top-16 -right-6 font-display text-[16rem] leading-none text-gilt opacity-20 select-none md:text-[22rem]">
          ❦
        </span>
        <div className="relative max-w-2xl">
          <p className="font-ui text-step-n2 font-semibold tracking-[0.16em] text-gilt uppercase">Membership</p>
          <h2 className="mt-4 font-display text-step-4 leading-tight">{s.heading ?? "Keep the stories coming."}</h2>
          <p className="mt-5 font-reading text-step-1 leading-relaxed opacity-85">
            Members read every story, including exclusive essays, letters and collections, and make it possible for Inkinspire to stay
            independent, unhurried and free of advertising.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/membership" className="inline-flex min-h-12 items-center rounded-full bg-gilt px-7 font-semibold text-[#1B1A17] transition-opacity hover:opacity-90">
              See membership plans
            </Link>
            <Link href="/stories?access=premium" className="font-semibold underline-offset-4 hover:underline">
              Browse members’ stories
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function NewsletterSection({ s }: { s: HomepageSection }) {
  return (
    <section aria-label={s.heading ?? "Newsletter"} className="container-ink pt-16 md:pt-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="ornament text-step-2" aria-hidden>
          ❦
        </p>
        <h2 className="mt-4 font-display text-step-4">{s.heading ?? "New stories, in your inbox"}</h2>
        <p className="mx-auto mt-4 max-w-[46ch] font-reading text-step-1 text-ink-soft">
          One email when something new is published. No noise, no spam, and you can leave with one click.
        </p>
        <NewsletterForm source="homepage" className="mx-auto mt-8 max-w-lg text-left" />
      </div>
    </section>
  );
}

function EmptyHome() {
  return (
    <section className="container-ink py-24 text-center">
      <p className="ornament text-step-3" aria-hidden>
        ❦
      </p>
      <h2 className="mt-6 font-display text-step-4">The first story is on its way.</h2>
      <p className="mx-auto mt-4 max-w-[44ch] font-reading text-step-1 text-ink-soft">
        Inkinspire is getting ready. Subscribe and we’ll let you know the moment it’s published.
      </p>
      <NewsletterForm source="homepage" className="mx-auto mt-8 max-w-lg text-left" />
    </section>
  );
}
