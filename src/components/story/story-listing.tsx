import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import { clsx } from "clsx";
import { listStories, type StoryListQuery } from "@/server/content/public";
import { StoryCard } from "./story-card";
import { plural } from "@/lib/format";

type Params = Record<string, string | string[] | undefined>;

export function parseListParams(sp: Params) {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) as string | undefined;
  const page = Math.max(1, Number.parseInt(one("page") ?? "1", 10) || 1);
  const sort = one("sort") === "oldest" ? "oldest" : "newest";
  const access = one("access") === "free" || one("access") === "premium" ? (one("access") as "free" | "premium") : undefined;
  const view = one("view") === "list" ? "list" : "grid";
  return { page, sort, access, view } as const;
}

/**
 * The shared story index: filters as plain links (work without JavaScript, crawlable), grid/list
 * toggle, numbered pagination with real URLs.
 */
export async function StoryListing({
  basePath,
  query,
  params,
  emptyMessage = "No stories here yet. New ones are on the way.",
}: {
  basePath: string;
  query: Omit<StoryListQuery, "page" | "sort" | "access">;
  params: ReturnType<typeof parseListParams>;
  emptyMessage?: string;
}) {
  const { items, total, page, pages } = await listStories({ ...query, page: params.page, sort: params.sort, access: params.access });
  const href = (patch: Partial<Record<"page" | "sort" | "access" | "view", string | undefined>>) => {
    const next = { page: String(params.page), sort: params.sort, access: params.access, view: params.view, ...patch };
    const qs = new URLSearchParams();
    if (next.page && next.page !== "1") qs.set("page", next.page);
    if (next.sort && next.sort !== "newest") qs.set("sort", next.sort);
    if (next.access) qs.set("access", next.access);
    if (next.view && next.view !== "grid") qs.set("view", next.view);
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const chip = (active: boolean) =>
    clsx(
      "inline-flex min-h-10 items-center rounded-full border px-4 text-step-n1 font-medium transition-colors",
      active ? "border-ink bg-ink text-bg" : "border-rule text-ink-soft hover:border-rule-strong hover:text-ink",
    );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-5">
        <nav aria-label="Filter stories" className="flex flex-wrap items-center gap-2">
          <Link href={href({ access: undefined, page: "1" })} className={chip(!params.access)} aria-current={!params.access ? "true" : undefined}>
            All
          </Link>
          <Link href={href({ access: "free", page: "1" })} className={chip(params.access === "free")} aria-current={params.access === "free" ? "true" : undefined}>
            Free
          </Link>
          <Link href={href({ access: "premium", page: "1" })} className={chip(params.access === "premium")} aria-current={params.access === "premium" ? "true" : undefined}>
            Members
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <nav aria-label="Sort" className="flex items-center gap-1 text-step-n1">
            <span className="mr-1 text-ink-muted">Sort:</span>
            <Link href={href({ sort: "newest", page: "1" })} className={clsx("rounded px-2 py-2", params.sort === "newest" ? "font-semibold text-ink" : "text-ink-soft hover:text-ink")} aria-current={params.sort === "newest" ? "true" : undefined}>
              Newest
            </Link>
            <Link href={href({ sort: "oldest", page: "1" })} className={clsx("rounded px-2 py-2", params.sort === "oldest" ? "font-semibold text-ink" : "text-ink-soft hover:text-ink")} aria-current={params.sort === "oldest" ? "true" : undefined}>
              Oldest
            </Link>
          </nav>
          <span aria-hidden className="mx-1 h-5 w-px bg-rule" />
          <nav aria-label="Layout" className="flex items-center rounded-full border border-rule p-0.5">
            <Link href={href({ view: "grid" })} aria-label="Grid view" aria-current={params.view === "grid" ? "true" : undefined} className={clsx("inline-flex size-9 items-center justify-center rounded-full", params.view === "grid" ? "bg-ink text-bg" : "text-ink-soft")}>
              <LayoutGrid aria-hidden size={16} />
            </Link>
            <Link href={href({ view: "list" })} aria-label="List view" aria-current={params.view === "list" ? "true" : undefined} className={clsx("inline-flex size-9 items-center justify-center rounded-full", params.view === "list" ? "bg-ink text-bg" : "text-ink-soft")}>
              <List aria-hidden size={16} />
            </Link>
          </nav>
        </div>
      </div>

      <p className="mt-4 text-step-n1 text-ink-muted" aria-live="polite">
        {plural(total, "story", "stories")}
        {pages > 1 && ` · page ${page} of ${pages}`}
      </p>

      {items.length === 0 ? (
        <div className="py-20 text-center">
          <p className="ornament text-step-2" aria-hidden>
            ❦
          </p>
          <p className="mx-auto mt-4 max-w-[40ch] font-reading text-step-1 text-ink-soft">{emptyMessage}</p>
        </div>
      ) : params.view === "list" ? (
        <div className="mt-4 max-w-4xl">
          {items.map((s) => (
            <StoryCard key={s.id} story={s} variant="list" headingLevel={2} />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s, i) => (
            <StoryCard key={s.id} story={s} headingLevel={2} priority={i < 2 && page === 1} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-1">
          {page > 1 && (
            <Link href={href({ page: String(page - 1) })} rel="prev" className="inline-flex min-h-11 items-center rounded-full px-4 text-step-n1 font-semibold hover:bg-sunken">
              ← Newer
            </Link>
          )}
          {Array.from({ length: pages }, (_, i) => i + 1)
            .filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1)
            .map((n, i, arr) => (
              <span key={n} className="flex items-center">
                {i > 0 && arr[i - 1] !== n - 1 && <span className="px-1 text-ink-muted">…</span>}
                <Link
                  href={href({ page: String(n) })}
                  aria-current={n === page ? "page" : undefined}
                  className={clsx("inline-flex size-11 items-center justify-center rounded-full text-step-n1 tabular-nums", n === page ? "bg-ink font-semibold text-bg" : "hover:bg-sunken")}
                >
                  {n}
                </Link>
              </span>
            ))}
          {page < pages && (
            <Link href={href({ page: String(page + 1) })} rel="next" className="inline-flex min-h-11 items-center rounded-full px-4 text-step-n1 font-semibold hover:bg-sunken">
              Older →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

export function ListingSkeleton() {
  return (
    <div aria-hidden className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i}>
          <div className="aspect-[3/2] animate-pulse rounded-[var(--radius-s)] bg-sunken" />
          <div className="mt-5 h-3 w-24 animate-pulse rounded bg-sunken" />
          <div className="mt-3 h-6 w-4/5 animate-pulse rounded bg-sunken" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-sunken" />
        </div>
      ))}
    </div>
  );
}

export function PageIntro({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string | null; children?: React.ReactNode }) {
  return (
    <header className="grain border-b border-rule">
      <div className="container-ink py-12 md:py-20">
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        <h1 className="max-w-4xl font-display text-step-5 leading-[1.04] tracking-[-0.02em]" style={{ fontVariationSettings: '"opsz" 144' }}>
          {title}
        </h1>
        {description && <p className="mt-5 max-w-[52ch] font-reading text-step-1 leading-relaxed text-ink-soft">{description}</p>}
        {children}
      </div>
    </header>
  );
}
