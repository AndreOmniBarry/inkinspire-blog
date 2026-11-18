/**
 * `pnpm db:seed`: idempotent first-install content.
 *
 * Always: the 8 blueprint categories, the owner's author profile, About + legal page templates,
 * homepage layout, default feature flags.
 * Demo (labelled, removable): 12 original stories, tags, a collection.
 * Development only: an owner account with a one-time password printed to the console.
 * In production, create the owner with `pnpm owner:create` instead (no default passwords, ever).
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../src/server/db";
import { deriveContent } from "../src/server/content/derive";
import { hashPassword } from "../src/server/security/hash";
import { toDoc } from "./demo/markup";
import { demoStories } from "./demo/stories";
import { seedPages } from "./demo/pages";
import { seedCategories, seedCollections } from "./demo/taxonomy";
import { renderHtml } from "../src/lib/editor/render";
import { sanitize } from "../src/server/content/derive";

const s = schema;
const DAY = 86_400_000;

async function main() {
  const withDemo = !process.argv.includes("--no-demo");

  // Categories
  for (const [i, c] of seedCategories.entries()) {
    await db
      .insert(s.categories)
      .values({ ...c, position: i })
      .onConflictDoUpdate({ target: s.categories.slug, set: { name: c.name, description: c.description, colour: c.colour, position: i } });
  }
  const cats = new Map((await db.select().from(s.categories)).map((c) => [c.slug, c.id]));

  // Owner's author profile
  await db
    .insert(s.authors)
    .values({
      slug: "xenia",
      name: "Xenia, the Storyteller",
      tagline: "Storyteller, poet and founder of Inkinspire",
      bio: "Xenia (Sylvia Simon) writes about the quiet, ordinary moments where life turns: family, love, growth, loss and the truths we rarely say out loud. [Owner: replace this with your own bio in Studio › Authors.]",
      socials: {},
    })
    .onConflictDoNothing({ target: s.authors.slug });
  const author = await db.query.authors.findFirst({ where: eq(s.authors.slug, "xenia") });

  // Pages
  for (const p of seedPages) {
    const doc = toDoc(p.body);
    const exists = await db.query.pages.findFirst({ where: eq(s.pages.slug, p.slug) });
    if (exists) continue;
    const [row] = await db
      .insert(s.pages)
      .values({ slug: p.slug, title: p.title, kind: p.kind, contentJson: doc, html: sanitize(renderHtml(doc)), seoDescription: p.seoDescription, isTemplate: p.isTemplate })
      .returning();
    await db.insert(s.pageRevisions).values({ pageId: row.id, title: row.title, contentJson: doc });
  }

  // Homepage layout (order is curated in Studio › Homepage)
  const [{ n: slotCount }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.homepageSlots);
  if (!slotCount) {
    const order = ["hero", "editors_picks", "latest", "categories", "popular", "author", "membership", "newsletter"] as const;
    await db.insert(s.homepageSlots).values(order.map((section, position) => ({ section, position })));
  }

  // Feature flags
  await db
    .insert(s.featureFlags)
    .values([
      { key: "social_login", enabled: false, description: "Let readers sign in with Google. Off until the owner adds Google credentials." },
      { key: "quote_cards", enabled: true, description: "Readers can share a highlighted quote as an image." },
      { key: "comments", enabled: true, description: "Reader comments (moderated)." },
    ])
    .onConflictDoNothing();

  // Demo stories go only into a publication with no stories yet, so "Remove demo content"
  // stays removed even though the seed runs on every deploy.
  const [{ n: postCount }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.posts);
  if (withDemo && author && postCount === 0) {
    for (const c of seedCollections) {
      await db.insert(s.collections).values({ ...c, isDemo: true }).onConflictDoNothing({ target: s.collections.slug });
    }
    const colls = new Map((await db.select().from(s.collections)).map((c) => [c.slug, c.id]));
    const now = Date.now();
    for (const story of demoStories) {
      const exists = await db.query.posts.findFirst({ where: eq(s.posts.slug, story.slug) });
      if (exists) continue;
      const doc = toDoc(story.body);
      const d = await deriveContent(doc, story.visibility);
      const when = new Date(now - story.daysAgo * DAY);
      const scheduled = story.daysAgo < 0;
      const [post] = await db
        .insert(s.posts)
        .values({
          slug: story.slug,
          title: story.title,
          subtitle: story.subtitle,
          excerpt: story.excerpt,
          status: scheduled ? "scheduled" : "published",
          visibility: story.visibility,
          contentJson: doc,
          ...d,
          categoryId: cats.get(story.category) ?? null,
          collectionId: story.collection ? (colls.get(story.collection) ?? null) : null,
          featured: !!story.featured,
          scheduledAt: scheduled ? when : null,
          publishedAt: scheduled ? null : when,
          isDemo: true,
          createdAt: new Date(when.getTime() - 3 * DAY),
        })
        .returning();
      await db.insert(s.postAuthors).values({ postId: post.id, authorId: author.id });
      for (const t of story.tags) {
        const [tag] = await db
          .insert(s.tags)
          .values({ slug: t, name: t.replace(/-/g, " ").replace(/^./, (m) => m.toUpperCase()) })
          .onConflictDoUpdate({ target: s.tags.slug, set: { slug: t } })
          .returning();
        await db.insert(s.postTags).values({ postId: post.id, tagId: tag.id }).onConflictDoNothing();
      }
      await db.insert(s.postRevisions).values({ postId: post.id, title: post.title, contentJson: doc, wordCount: d.wordCount, reason: "publish" });
    }
    // Hand-pick the homepage: hero + editor's picks.
    const pick = async (slug: string) => (await db.query.posts.findFirst({ where: eq(s.posts.slug, slug), columns: { id: true } }))?.id;
    const hero = await pick("the-hour-before-the-generator");
    const picks = (await Promise.all(["what-my-grandmother-knew-about-salt", "harmattan-letter", "letters-to-my-younger-self-on-rooms"].map(pick))).filter(Boolean) as string[];
    if (hero) await db.update(s.homepageSlots).set({ postIds: [hero] }).where(eq(s.homepageSlots.section, "hero"));
    await db.update(s.homepageSlots).set({ postIds: picks }).where(eq(s.homepageSlots.section, "editors_picks"));
  }

  // Development owner account
  if (process.env.NODE_ENV !== "production" && !process.argv.includes("--no-owner")) {
    const email = process.env.SEED_OWNER_EMAIL ?? "owner@inkinspire.local";
    const existing = await db.query.users.findFirst({ where: sql`lower(${s.users.email}) = ${email.toLowerCase()}` });
    if (!existing) {
      const password = process.env.SEED_OWNER_PASSWORD ?? randomBytes(9).toString("base64url");
      const [user] = await db
        .insert(s.users)
        .values({ name: "Sylvia Simon", email, emailVerified: true, role: "owner", mustChangePassword: !process.env.SEED_OWNER_PASSWORD })
        .returning();
      await db.insert(s.accounts).values({ accountId: user.id, providerId: "credential", userId: user.id, password: await hashPassword(password) });
      if (author) await db.update(s.authors).set({ userId: user.id }).where(eq(s.authors.id, author.id));
      console.log(`\n  Development owner created\n  Email:    ${email}\n  Password: ${password}\n  (You will be asked to change it and set up two-step verification on first sign-in.)\n`);
    }
  }

  console.log(`Seed complete${withDemo ? " (with demo content)" : ""}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
