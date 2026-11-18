import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { esc } from "@/lib/editor/render";
import type { CategoryColour } from "@/styles/tokens";

export type SearchHit = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  visibility: "free" | "premium";
  readingMinutes: number;
  date: string;
  category: { slug: string; name: string; colour: CategoryColour } | null;
  author: string | null;
  /** Safe HTML: escaped text with <mark> around matches. */
  snippet: string;
};

/**
 * Full-text search (blueprint 5.4): title, keywords, categories, tags and author names.
 * Weighted ranking (title > subtitle/excerpt > body), typo tolerance via trigram similarity,
 * highlighted snippets. Premium stories are indexed from their public preview only, so search can
 * never reveal protected text (blueprint 7.6).
 */
export async function searchStories(qRaw: string, category?: string): Promise<SearchHit[]> {
  "use cache";
  cacheTag("posts");
  cacheLife("minutes");
  const q = qRaw.trim().slice(0, 120);
  if (q.length < 2) return [];
  const rows = await db.execute<{
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    visibility: "free" | "premium";
    reading_minutes: number;
    date: Date;
    cat_slug: string | null;
    cat_name: string | null;
    cat_colour: string | null;
    author: string | null;
    snippet: string;
    score: number;
  }>(sql`
    with q as (select websearch_to_tsquery('english', ${q}) as tsq, ${q}::text as raw)
    select p.id, p.slug, p.title, p.excerpt, p.visibility, p.reading_minutes,
      coalesce(p.published_at, p.scheduled_at) as date,
      c.slug as cat_slug, c.name as cat_name, c.colour as cat_colour,
      (select a.name from post_authors pa join authors a on a.id = pa.author_id where pa.post_id = p.id order by pa.position limit 1) as author,
      ts_headline('english', p.search_text, q.tsq, 'StartSel=' || chr(1) || ',StopSel=' || chr(2) || ',MaxFragments=1,MaxWords=30,MinWords=14,ShortWord=2') as snippet,
      (
        ts_rank_cd(p.search_vector, q.tsq, 32) * 4
        + greatest(similarity(p.title, q.raw), word_similarity(q.raw, p.title)) * 2
        + case when c.name ilike '%' || q.raw || '%' then 0.6 else 0 end
        + case when exists (select 1 from post_tags pt join tags t on t.id = pt.tag_id where pt.post_id = p.id and (t.name ilike '%' || q.raw || '%' or similarity(t.name, q.raw) > 0.4)) then 0.6 else 0 end
        + case when exists (select 1 from post_authors pa join authors a on a.id = pa.author_id where pa.post_id = p.id and (a.name ilike '%' || q.raw || '%' or word_similarity(q.raw, a.name) > 0.5)) then 0.8 else 0 end
      ) as score
    from posts p
    cross join q
    left join categories c on c.id = p.category_id
    where (p.status = 'published' or (p.status = 'scheduled' and p.scheduled_at <= now()))
      and (${category ?? null}::text is null or c.slug = ${category ?? null})
      and (
        p.search_vector @@ q.tsq
        or word_similarity(q.raw, p.title) > 0.45
        or c.name ilike '%' || q.raw || '%'
        or exists (select 1 from post_tags pt join tags t on t.id = pt.tag_id where pt.post_id = p.id and (t.name ilike '%' || q.raw || '%' or similarity(t.name, q.raw) > 0.4))
        or exists (select 1 from post_authors pa join authors a on a.id = pa.author_id where pa.post_id = p.id and (a.name ilike '%' || q.raw || '%' or word_similarity(q.raw, a.name) > 0.5))
        or word_similarity(q.raw, p.search_text) > 0.6
      )
    order by score desc, date desc
    limit 30
  `);
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    visibility: r.visibility,
    readingMinutes: r.reading_minutes,
    date: new Date(r.date).toISOString(),
    category: r.cat_slug ? { slug: r.cat_slug, name: r.cat_name!, colour: r.cat_colour as CategoryColour } : null,
    author: r.author,
    snippet: highlight(r.snippet || r.excerpt || ""),
  }));
}

/** Escape everything, then turn the sentinel characters into <mark>. Never trusts the text. */
export function highlight(s: string): string {
  return esc(s).replace(/\u0001/g, "<mark>").replace(/\u0002/g, "</mark>");
}

/** "Did you mean": closest title words when nothing matched. */
export async function suggest(qRaw: string): Promise<string | null> {
  "use cache";
  cacheTag("posts");
  cacheLife("minutes");
  const q = qRaw.trim().slice(0, 60);
  if (q.length < 3) return null;
  const rows = await db.execute<{ word: string }>(sql`
    select word from ts_stat($$select to_tsvector('simple', title || ' ' || coalesce(excerpt, '')) from posts where status = 'published'$$)
    where similarity(word, ${q.toLowerCase()}) > 0.35 order by similarity(word, ${q.toLowerCase()}) desc limit 1`);
  return rows[0]?.word ?? null;
}
