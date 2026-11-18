import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";

/**
 * The set of public addresses that exist, kept in memory per server instance (one small query per
 * minute). The proxy uses it to send a real 404 for unknown stories, themes and authors before any
 * streaming starts, instead of a "soft 404". A miss triggers one refresh, so new stories and
 * scheduled stories that just went live are found immediately.
 */
type Index = { at: number; keys: Set<string> };
let index: Index | null = null;
let refreshing: Promise<Index> | null = null;
let lastMissRefresh = 0;

async function load(): Promise<Index> {
  const rows = await db.execute<{ k: string }>(sql`
    select 'stories/' || slug as k from posts where status in ('published', 'archived') or (status = 'scheduled' and scheduled_at <= now())
    union all select 'category/' || slug from categories
    union all select 'tags/' || slug from tags
    union all select 'collections/' || slug from collections
    union all select 'authors/' || slug from authors
    union all select 'legal/' || slug from pages where kind = 'legal'`);
  return { at: Date.now(), keys: new Set(rows.map((r) => r.k)) };
}

async function refresh() {
  refreshing ??= load().finally(() => (refreshing = null));
  index = await refreshing;
  return index;
}

export async function publicRouteExists(key: string): Promise<boolean> {
  const current = index && Date.now() - index.at < 60_000 ? index : await refresh();
  if (current.keys.has(key)) return true;
  if (Date.now() - lastMissRefresh > 3_000) {
    lastMissRefresh = Date.now();
    return (await refresh()).keys.has(key);
  }
  return false;
}
