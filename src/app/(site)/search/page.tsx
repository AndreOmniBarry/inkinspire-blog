import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Search as SearchIcon } from "lucide-react";
import { searchStories, suggest } from "@/server/content/search";
import { getCategories } from "@/server/content/public";
import { PremiumMark } from "@/components/story/marks";
import { formatDate, plural, readingTime } from "@/lib/format";
import { db, schema } from "@/server/db";

export const metadata: Metadata = { title: "Search", description: "Search every story, poem and reflection on Inkinspire.", robots: { index: false, follow: true } };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="container-ink py-12 md:py-16">
      <h1 className="font-display text-step-5">Search</h1>
      <Suspense fallback={<SearchForm q="" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function SearchForm({ q, category }: { q: string; category?: string }) {
  return (
    <form role="search" action="/search" className="mt-6 max-w-2xl">
      <label htmlFor="q" className="sr-only">
        Search stories
      </label>
      <div className="relative">
        <SearchIcon aria-hidden size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-muted" />
        <input id="q" name="q" type="search" defaultValue={q} placeholder="A title, a feeling, a name…" autoComplete="off" className="field min-h-14 rounded-full pr-28 pl-12 text-step-1" autoFocus={!q} />
        {category && <input type="hidden" name="category" value={category} />}
        <button type="submit" className="absolute top-1.5 right-1.5 min-h-11 rounded-full bg-accent px-5 text-step-n1 font-semibold text-on-accent hover:bg-accent-hover">
          Search
        </button>
      </div>
    </form>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const sp = await searchParams;
  const q = String(Array.isArray(sp.q) ? sp.q[0] : (sp.q ?? "")).slice(0, 120);
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const [hits, cats] = await Promise.all([searchStories(q, category), getCategories()]);
  if (q.trim().length >= 2) {
    await connection();
    // Search terms power the owner's analytics ("what readers look for"). No personal data.
    await db.insert(schema.analyticsEvents).values({ type: "search", query: q.trim().toLowerCase().slice(0, 120), path: "/search" });
  }
  const didYouMean = q && hits.length === 0 ? await suggest(q) : null;
  return (
    <>
      <SearchForm q={q} category={category} />
      {q && (
        <nav aria-label="Filter by theme" className="mt-6 flex flex-wrap gap-2">
          <Link href={`/search?q=${encodeURIComponent(q)}`} className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-step-n1 ${!category ? "border-ink bg-ink text-bg" : "border-rule text-ink-soft hover:text-ink"}`}>
            All themes
          </Link>
          {cats.map((c) => (
            <Link
              key={c.slug}
              href={`/search?q=${encodeURIComponent(q)}&category=${c.slug}`}
              className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-step-n1 ${category === c.slug ? "border-ink bg-ink text-bg" : "border-rule text-ink-soft hover:text-ink"}`}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      )}
      <div className="mt-10 max-w-3xl" aria-live="polite">
        {!q ? (
          <p className="font-reading text-step-1 text-ink-soft">Try a title, a theme like “grief” or “family”, or an author’s name.</p>
        ) : hits.length === 0 ? (
          <div>
            <p className="font-reading text-step-1">Nothing found for “{q}”.</p>
            {didYouMean && (
              <p className="mt-3 text-step-0">
                Did you mean{" "}
                <Link href={`/search?q=${encodeURIComponent(didYouMean)}`} className="font-semibold text-accent underline">
                  {didYouMean}
                </Link>
                ?
              </p>
            )}
            <p className="mt-6 text-step-0 text-ink-soft">
              Or <Link href="/stories" className="underline">browse all stories</Link>.
            </p>
          </div>
        ) : (
          <>
            <p className="text-step-n1 text-ink-muted">
              {plural(hits.length, "result")} for “{q}”
            </p>
            <ol className="mt-4">
              {hits.map((h) => (
                <li key={h.id} className="group relative border-b border-rule py-6">
                  {h.category && <p className="eyebrow">{h.category.name}</p>}
                  <h2 className="mt-1.5 font-display text-step-2">
                    <Link href={`/stories/${h.slug}`} className="after:absolute after:inset-0 group-hover:text-accent">
                      {h.title}
                    </Link>
                  </h2>
                  <p className="search-snippet mt-2 font-reading text-step-0 text-ink-soft" dangerouslySetInnerHTML={{ __html: h.snippet }} />
                  <p className="mt-3 flex flex-wrap items-center gap-x-2 font-ui text-step-n2 text-ink-muted">
                    {h.author && <span>{h.author}</span>}
                    <span aria-hidden>·</span>
                    <time dateTime={h.date}>{formatDate(h.date)}</time>
                    <span aria-hidden>·</span>
                    <span>{readingTime(h.readingMinutes)}</span>
                    {h.visibility === "premium" && <PremiumMark className="ml-1" />}
                  </p>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </>
  );
}
