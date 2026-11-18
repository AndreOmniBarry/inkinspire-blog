import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/server/db";
import type { SocialNetwork } from "@/server/db/schema";

/** Typed site settings with sensible defaults; the owner edits them in Studio › Settings. */
export type SiteSettings = {
  identity: {
    name: string;
    tagline: string;
    description: string;
    contactEmail: string;
    logoMediaId: string | null;
  };
  socials: Partial<Record<SocialNetwork, string>>;
  navigation: Array<{ label: string; href: string }>;
  seo: { defaultTitle: string; titleTemplate: string; defaultDescription: string; ogImageMediaId: string | null };
  community: { commentsEnabled: boolean; holdFirstComments: boolean };
  membership: { gracePeriodDays: number; renewalReminderDays: number; refundPolicy: "keep_until_period_end" | "revoke_immediately" };
  maintenance: { enabled: boolean; message: string };
};

export const defaultSettings: SiteSettings = {
  identity: {
    name: "Inkinspire",
    tagline: "Stories that stay with you.",
    description:
      "A literary home for stories, poetry and reflections on life, love, growth and the truths we rarely say out loud, from Xenia, the Storyteller.",
    contactEmail: "hello@inkinspire.com",
    logoMediaId: null,
  },
  socials: {},
  navigation: [
    { label: "Stories", href: "/stories" },
    { label: "Poetry", href: "/category/poetry-and-creative-writing" },
    { label: "About", href: "/about" },
    { label: "Membership", href: "/membership" },
  ],
  seo: {
    defaultTitle: "Inkinspire: stories, poetry and reflections",
    titleTemplate: "%s · Inkinspire",
    defaultDescription:
      "Thought-provoking stories, poetry and reflections on life, love and growth. A literary publication by Xenia, the Storyteller.",
    ogImageMediaId: null,
  },
  community: { commentsEnabled: true, holdFirstComments: true },
  membership: { gracePeriodDays: 5, renewalReminderDays: 3, refundPolicy: "keep_until_period_end" },
  maintenance: { enabled: false, message: "We’re tidying the shelves. Back very soon." },
};

type Key = keyof SiteSettings;

export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag("settings");
  cacheLife("days");
  const rows = await db
    .select()
    .from(schema.siteSettings)
    .where(inArray(schema.siteSettings.key, Object.keys(defaultSettings)));
  const out = structuredClone(defaultSettings) as Record<Key, unknown>;
  for (const r of rows) {
    const k = r.key as Key;
    out[k] = { ...(defaultSettings[k] as object), ...(r.value as object) };
  }
  return out as SiteSettings;
}
