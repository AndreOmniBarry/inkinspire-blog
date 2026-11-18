import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, asc, count, desc, eq, gt, inArray, ne, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { mediaSources } from "@/server/media/url";
import type { CategoryColour } from "@/styles/tokens";

/**
 * Public, cacheable reads for the Publication.
 *
 * SECURITY: this module never selects `posts.body_html` or `posts.content_json`. The protected part
 * of a premium story is only reachable through src/server/content/protected.ts, after an
 * entitlement check. tests/unit/public-columns.test.ts enforces this.
 */

const { posts, categories, authors, postAuthors, media, tags, postTags, collections } = schema;

/** A story is live when published, or scheduled and its time has come (ADR-005). */
export const isLive: SQL = sql`(${posts.status} = 'published' OR (${posts.status} = 'scheduled' AND ${posts.scheduledAt} <= now()))`;
/** Live or archived: archived stories keep their URL (with a notice) but leave every list. */
const isReachable: SQL = sql`(${isLive} OR ${posts.status} = 'archived')`;
const effectiveDate = sql<Date>`coalesce(${posts.publishedAt}, ${posts.scheduledAt}, ${posts.createdAt})`;

/**
 * Lifetime for cached lists: normally hours, but never past the moment the next scheduled story goes
 * live, so scheduled publishing is exact even though pages are cached.
 */
async function applyScheduleAwareLife(defaultSeconds = 3600) {
  const [row] = await db
    .select({ at: sql<Date | null>`min(${posts.scheduledAt})` })
    .from(posts)
    .where(and(eq(posts.status, "scheduled"), gt(posts.scheduledAt, sql`now()`)));
  const at = row?.at ? new Date(row.at).getTime() : null;
  const untilNext = at ? Math.max(1, Math.ceil((at - Date.now()) / 1000)) : defaultSeconds;
  const revalidate = Math.min(defaultSeconds, untilNext);
  cacheLife({ stale: Math.min(60, revalidate), revalidate, expire: Math.max(revalidate * 4, 3600) });
}

export type StoryCover = {
  src: string;
  srcSet?: string;
  avifSet?: string;
  width?: number;
  height?: number;
  alt: string;
  blurhash: string | null;
  focalX: number;
  focalY: number;
};

export type StoryCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  visibility: "free" | "premium";
  readingMinutes: number;
  date: string; // ISO
  featured: boolean;
  category: { slug: string; name: string; colour: CategoryColour } | null;
  author: { slug: string; name: string } | null;
  cover: StoryCover | null;
};

const cardColumns = {
  id: posts.id,
  slug: posts.slug,
  title: posts.title,
  subtitle: posts.subtitle,
  excerpt: posts.excerpt,
  visibility: posts.visibility,
  readingMinutes: posts.readingMinutes,
  date: effectiveDate,
  featured: posts.featured,
  categorySlug: categories.slug,
  categoryName: categories.name,
  categoryColour: categories.colour,
  coverKey: media.key,
  coverVariants: media.variants,
  coverWidth: media.width,
  coverHeight: media.height,
  coverAlt: media.alt,
  coverBlurhash: media.blurhash,
  coverFocalX: media.focalX,
  coverFocalY: media.focalY,
  authorSlug: sql<string | null>`(select a.slug from ${postAuthors} pa join ${authors} a on a.id = pa.author_id where pa.post_id = ${posts.id} order by pa.position limit 1)`,
  authorName: sql<string | null>`(select a.name from ${postAuthors} pa join ${authors} a on a.id = pa.author_id where pa.post_id = ${posts.id} order by pa.position limit 1)`,
};

type CardRow = {
  [K in keyof typeof cardColumns]: unknown;
};

function toCard(r: CardRow): StoryCard {
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    subtitle: (r.subtitle as string) ?? null,
    excerpt: (r.excerpt as string) ?? null,
    visibility: r.visibility as "free" | "premium",
    readingMinutes: r.readingMinutes as number,
    date: new Date(r.date as string).toISOString(),
    featured: r.featured as boolean,
    category: r.categorySlug
      ? { slug: r.categorySlug as string, name: r.categoryName as string, colour: r.categoryColour as CategoryColour }
      : null,
    author: r.authorSlug ? { slug: r.authorSlug as string, name: r.authorName as string } : null,
    cover: r.coverKey
      ? {
          ...mediaSources({
            key: r.coverKey as string,
            variants: r.coverVariants as Record<string, Record<string, string>>,
            width: r.coverWidth as number | null,
            height: r.coverHeight as number | null,
          }),
          alt: r.coverAlt as string,
          blurhash: (r.coverBlurhash as string) ?? null,
          focalX: r.coverFocalX as number,
          focalY: r.coverFocalY as number,
        }
      : null,
  };
}

function cardQuery() {
  return db
    .select(cardColumns)
    .from(posts)
    .leftJoin(categories, eq(categories.id, posts.categoryId))
    .leftJoin(media, eq(media.id, posts.coverMediaId));
}

export const PAGE_SIZE = 12;

export type StoryListQuery = {
  page?: number;
  category?: string;
  tag?: string;
  author?: string;
  collection?: string;
  sort?: "newest" | "oldest";
  access?: "free" | "premium";
};

export async function listStories(q: StoryListQuery = {}): Promise<{ items: StoryCard[]; total: number; page: number; pages: number }> {
  "use cache";
  cacheTag("posts");
  await applyScheduleAwareLife();
  const page = Math.max(1, Math.floor(q.page ?? 1));
  const where: SQL[] = [isLive];
  if (q.category) where.push(eq(categories.slug, q.category));
  if (q.access) where.push(eq(posts.visibility, q.access));
  if (q.tag)
    where.push(
      sql`exists (select 1 from ${postTags} pt join ${tags} t on t.id = pt.tag_id where pt.post_id = ${posts.id} and t.slug = ${q.tag})`,
    );
  if (q.author)
    where.push(
      sql`exists (select 1 from ${postAuthors} pa join ${authors} a on a.id = pa.author_id where pa.post_id = ${posts.id} and a.slug = ${q.author})`,
    );
  if (q.collection)
    where.push(sql`exists (select 1 from ${collections} c where c.id = ${posts.collectionId} and c.slug = ${q.collection})`);

  const [{ total }] = await db
    .select({ total: count() })
    .from(posts)
    .leftJoin(categories, eq(categories.id, posts.categoryId))
    .where(and(...where));
  const rows = await cardQuery()
    .where(and(...where))
    .orderBy(q.sort === "oldest" ? asc(effectiveDate) : desc(effectiveDate), asc(posts.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  return { items: rows.map(toCard), total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getStoriesByIds(ids: string[]): Promise<StoryCard[]> {
  "use cache";
  cacheTag("posts");
  await applyScheduleAwareLife();
  if (!ids.length) return [];
  const rows = await cardQuery().where(and(isLive, inArray(posts.id, ids)));
  const byId = new Map(rows.map((r) => [r.id as string, toCard(r)]));
  return ids.map((id) => byId.get(id)).filter((c): c is StoryCard => !!c);
}

export async function getFeaturedStories(limit = 6): Promise<StoryCard[]> {
  "use cache";
  cacheTag("posts");
  await applyScheduleAwareLife();
  const rows = await cardQuery()
    .where(and(isLive, eq(posts.featured, true)))
    .orderBy(desc(effectiveDate))
    .limit(limit);
  return rows.map(toCard);
}

/** Popular = most completed reads in the last 30 days (first-party data), then most viewed. */
export async function getPopularStories(limit = 5): Promise<StoryCard[]> {
  "use cache";
  cacheTag("posts", "analytics");
  cacheLife("hours");
  const ranked = await db
    .select({
      postId: schema.analyticsEvents.postId,
      score: sql<number>`sum(case when ${schema.analyticsEvents.type} = 'read_complete' then 3 else 1 end)::int`,
    })
    .from(schema.analyticsEvents)
    .where(
      and(
        inArray(schema.analyticsEvents.type, ["view", "read_complete"]),
        sql`${schema.analyticsEvents.createdAt} > now() - interval '30 days'`,
        sql`${schema.analyticsEvents.postId} is not null`,
      ),
    )
    .groupBy(schema.analyticsEvents.postId)
    .orderBy(desc(sql`2`))
    .limit(limit * 2);
  const ids = ranked.map((r) => r.postId!).filter(Boolean);
  const popular = ids.length ? await getStoriesByIds(ids) : [];
  if (popular.length >= limit) return popular.slice(0, limit);
  // Young publication: fill with featured, then newest, so the section is never empty.
  const fill = await cardQuery()
    .where(and(isLive, ids.length ? sql`${posts.id} not in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})` : sql`true`))
    .orderBy(desc(posts.featured), desc(effectiveDate))
    .limit(limit - popular.length);
  return [...popular, ...fill.map(toCard)];
}

/* ─────────────── Single story (public part only) ─────────────── */

export type PublicStory = StoryCard & {
  status: "published" | "scheduled" | "archived";
  previewHtml: string;
  hasPaywall: boolean;
  wordCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  commentsEnabled: boolean;
  updatedAt: string;
  categoryId: string | null;
  collection: { slug: string; name: string } | null;
  tags: Array<{ slug: string; name: string }>;
  authors: Array<{ slug: string; name: string; tagline: string | null; bio: string | null; photo: StoryCover | null }>;
};

export async function getStory(slug: string): Promise<PublicStory | null> {
  "use cache";
  cacheTag("posts", `post:${slug}`);
  await applyScheduleAwareLife();
  const [row] = await db
    .select({
      ...cardColumns,
      status: posts.status,
      previewHtml: posts.previewHtml, // never body_html
      hasPaywall: posts.hasPaywall,
      wordCount: posts.wordCount,
      seoTitle: posts.seoTitle,
      seoDescription: posts.seoDescription,
      canonicalUrl: posts.canonicalUrl,
      commentsEnabled: posts.commentsEnabled,
      updatedAt: posts.updatedAt,
      categoryId: posts.categoryId,
      collectionId: posts.collectionId,
    })
    .from(posts)
    .leftJoin(categories, eq(categories.id, posts.categoryId))
    .leftJoin(media, eq(media.id, posts.coverMediaId))
    .where(and(eq(posts.slug, slug), isReachable))
    .limit(1);
  if (!row) return null;

  const [authorRows, tagRows, collection] = await Promise.all([
    db
      .select({ slug: authors.slug, name: authors.name, tagline: authors.tagline, bio: authors.bio, photo: media })
      .from(postAuthors)
      .innerJoin(authors, eq(authors.id, postAuthors.authorId))
      .leftJoin(media, eq(media.id, authors.photoMediaId))
      .where(eq(postAuthors.postId, row.id as string))
      .orderBy(asc(postAuthors.position)),
    db
      .select({ slug: tags.slug, name: tags.name })
      .from(postTags)
      .innerJoin(tags, eq(tags.id, postTags.tagId))
      .where(eq(postTags.postId, row.id as string))
      .orderBy(asc(tags.name)),
    row.collectionId
      ? db.query.collections.findFirst({ where: eq(collections.id, row.collectionId as string), columns: { slug: true, name: true } })
      : Promise.resolve(undefined),
  ]);

  return {
    ...toCard(row),
    status: row.status === "scheduled" ? "published" : (row.status as "published" | "archived"),
    previewHtml: row.previewHtml as string,
    hasPaywall: row.hasPaywall as boolean,
    wordCount: row.wordCount as number,
    seoTitle: (row.seoTitle as string) ?? null,
    seoDescription: (row.seoDescription as string) ?? null,
    canonicalUrl: (row.canonicalUrl as string) ?? null,
    commentsEnabled: row.commentsEnabled as boolean,
    updatedAt: new Date(row.updatedAt as Date).toISOString(),
    categoryId: (row.categoryId as string) ?? null,
    collection: collection ?? null,
    tags: tagRows,
    authors: authorRows.map((a) => ({
      slug: a.slug,
      name: a.name,
      tagline: a.tagline,
      bio: a.bio,
      photo: a.photo
        ? { ...mediaSources(a.photo), alt: a.photo.alt, blurhash: a.photo.blurhash, focalX: a.photo.focalX, focalY: a.photo.focalY }
        : null,
    })),
  };
}

/** Related: same collection first, then shared tags, then same category, newest first. */
export async function getRelatedStories(story: Pick<PublicStory, "id" | "categoryId">, limit = 3): Promise<StoryCard[]> {
  "use cache";
  cacheTag("posts");
  await applyScheduleAwareLife();
  const score = sql<number>`(
      case when ${posts.collectionId} is not null and ${posts.collectionId} = (select collection_id from ${posts} p2 where p2.id = ${story.id}) then 4 else 0 end
    + (select count(*) from ${postTags} a join ${postTags} b on a.tag_id = b.tag_id where a.post_id = ${posts.id} and b.post_id = ${story.id}) * 2
    + case when ${posts.categoryId} = ${story.categoryId ?? null} then 1 else 0 end
  )`;
  const rows = await cardQuery()
    .where(and(isLive, ne(posts.id, story.id)))
    .orderBy(desc(score), desc(effectiveDate))
    .limit(limit);
  return rows.map(toCard);
}

/** Previous/next by date, for the end of a story. */
export async function getAdjacentStories(id: string): Promise<{ newer: StoryCard | null; older: StoryCard | null }> {
  "use cache";
  cacheTag("posts");
  await applyScheduleAwareLife();
  const [current] = await db.select({ d: effectiveDate }).from(posts).where(eq(posts.id, id));
  if (!current) return { newer: null, older: null };
  const [newer] = await cardQuery().where(and(isLive, sql`${effectiveDate} > ${current.d}`)).orderBy(asc(effectiveDate)).limit(1);
  const [older] = await cardQuery().where(and(isLive, sql`${effectiveDate} < ${current.d}`)).orderBy(desc(effectiveDate)).limit(1);
  return { newer: newer ? toCard(newer) : null, older: older ? toCard(older) : null };
}

/* ─────────────── Taxonomy, authors ─────────────── */

export type CategoryWithCount = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  colour: CategoryColour;
  seoTitle: string | null;
  seoDescription: string | null;
  storyCount: number;
};

export async function getCategories(): Promise<CategoryWithCount[]> {
  "use cache";
  cacheTag("categories", "posts");
  await applyScheduleAwareLife(86400);
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      colour: categories.colour,
      seoTitle: categories.seoTitle,
      seoDescription: categories.seoDescription,
      storyCount: sql<number>`(select count(*)::int from ${posts} where ${posts.categoryId} = ${categories.id} and ${isLive})`,
    })
    .from(categories)
    .orderBy(asc(categories.position), asc(categories.name));
  return rows.map((r) => ({ ...r, colour: r.colour as CategoryColour }));
}

export async function getCategory(slug: string): Promise<CategoryWithCount | null> {
  const all = await getCategories();
  return all.find((c) => c.slug === slug) ?? null;
}

export async function getTag(slug: string) {
  "use cache";
  cacheTag("categories");
  cacheLife("days");
  return (await db.query.tags.findFirst({ where: eq(tags.slug, slug) })) ?? null;
}

export async function getCollection(slug: string) {
  "use cache";
  cacheTag("categories", "posts");
  cacheLife("hours");
  const c = await db.query.collections.findFirst({ where: eq(collections.slug, slug) });
  return c ?? null;
}

export async function getCollections() {
  "use cache";
  cacheTag("categories", "posts");
  cacheLife("hours");
  return db
    .select({
      slug: collections.slug,
      name: collections.name,
      description: collections.description,
      storyCount: sql<number>`(select count(*)::int from ${posts} where ${posts.collectionId} = ${collections.id} and ${isLive})`,
    })
    .from(collections)
    .orderBy(asc(collections.name));
}

export type PublicAuthor = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  bio: string | null;
  socials: Partial<Record<string, string>>;
  photo: StoryCover | null;
  storyCount: number;
};

export async function getAuthors(): Promise<PublicAuthor[]> {
  "use cache";
  cacheTag("authors", "posts");
  cacheLife("hours");
  const rows = await db
    .select({
      a: authors,
      photo: media,
      storyCount: sql<number>`(select count(*)::int from ${postAuthors} pa join ${posts} on ${posts.id} = pa.post_id where pa.author_id = ${authors.id} and ${isLive})`,
    })
    .from(authors)
    .leftJoin(media, eq(media.id, authors.photoMediaId))
    .orderBy(asc(authors.name));
  return rows.map(({ a, photo, storyCount }) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    tagline: a.tagline,
    bio: a.bio,
    socials: a.socials,
    storyCount,
    photo: photo ? { ...mediaSources(photo), alt: photo.alt, blurhash: photo.blurhash, focalX: photo.focalX, focalY: photo.focalY } : null,
  }));
}

export async function getAuthor(slug: string): Promise<PublicAuthor | null> {
  const all = await getAuthors();
  return all.find((a) => a.slug === slug) ?? null;
}

/** The owner's author profile (first non-guest author), for the homepage introduction. */
export async function getLeadAuthor(): Promise<PublicAuthor | null> {
  const all = await getAuthors();
  return all.filter((a) => a.storyCount > 0).sort((x, y) => y.storyCount - x.storyCount)[0] ?? all[0] ?? null;
}

/** All live slugs for the sitemap. */
export async function getSitemapEntries() {
  "use cache";
  cacheTag("posts", "categories", "authors");
  await applyScheduleAwareLife();
  const [stories, cats, auths] = await Promise.all([
    db.select({ slug: posts.slug, updatedAt: posts.updatedAt, date: effectiveDate }).from(posts).where(isLive).orderBy(desc(effectiveDate)),
    db.select({ slug: categories.slug, updatedAt: categories.updatedAt }).from(categories),
    db.select({ slug: authors.slug, updatedAt: authors.updatedAt }).from(authors),
  ]);
  return { stories, categories: cats, authors: auths };
}

