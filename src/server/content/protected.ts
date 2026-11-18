import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { hasPremium } from "@/server/billing/entitlements";
import { getSessionUser } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";

const { posts } = schema;

export type Continuation =
  | { kind: "full"; html: string } // the reader may read everything after the preview
  | { kind: "locked"; reason: "signed_out" | "not_member" | "expired" }
  | { kind: "none" }; // free story: the preview already is the whole story

/**
 * The ONLY path to the protected part of a premium story (blueprint 7.6).
 *
 * Runs at request time (reads the session), so its output is never stored in a shared cache.
 * Returns the remainder HTML only when the reader is entitled. Staff with edit rights can read
 * everything so they can proof published stories.
 */
export async function getContinuation(postId: string): Promise<Continuation> {
  const [post] = await db
    .select({ visibility: posts.visibility, hasPaywall: posts.hasPaywall })
    .from(posts)
    .where(and(eq(posts.id, postId), sql`(${posts.status} in ('published', 'archived') or (${posts.status} = 'scheduled' and ${posts.scheduledAt} <= now()))`))
    .limit(1);
  if (!post || post.visibility === "free") return { kind: "none" };

  const user = await getSessionUser();
  if (!user) return { kind: "locked", reason: "signed_out" };

  const entitled = (await hasPremium(user.id)) || can(user.role, "post.edit.any");
  if (!entitled) {
    const hadMembership = await db.query.entitlements.findFirst({
      where: and(eq(schema.entitlements.userId, user.id), eq(schema.entitlements.scope, "premium")),
      columns: { id: true },
    });
    return { kind: "locked", reason: hadMembership ? "expired" : "not_member" };
  }

  const [row] = await db.select({ bodyHtml: posts.bodyHtml, previewHtml: posts.previewHtml }).from(posts).where(eq(posts.id, postId));
  if (!row) return { kind: "none" };
  // Send only what follows the preview; the preview is already on the page.
  const remainder = row.bodyHtml.startsWith(row.previewHtml) ? row.bodyHtml.slice(row.previewHtml.length) : row.bodyHtml;
  return { kind: "full", html: remainder.trim() };
}
