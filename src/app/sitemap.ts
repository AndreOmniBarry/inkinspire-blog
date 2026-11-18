import type { MetadataRoute } from "next";
import { getSitemapEntries, getCollections } from "@/server/content/public";
import { getLegalSlugs } from "@/server/content/pages";

const base = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Every public URL. Premium stories are listed (their preview is public); the protected text never is. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ stories, categories, authors }, legal, collections] = await Promise.all([getSitemapEntries(), getLegalSlugs(), getCollections()]);
  const latest = stories[0]?.updatedAt ?? new Date();
  return [
    { url: `${base}/`, lastModified: latest, changeFrequency: "daily", priority: 1 },
    { url: `${base}/stories`, lastModified: latest, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/authors`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/membership`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.4 },
    ...stories.map((s) => ({ url: `${base}/stories/${s.slug}`, lastModified: s.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...categories.map((c) => ({ url: `${base}/category/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...collections.map((c) => ({ url: `${base}/collections/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...authors.map((a) => ({ url: `${base}/authors/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...legal.map((p) => ({ url: `${base}/legal/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
