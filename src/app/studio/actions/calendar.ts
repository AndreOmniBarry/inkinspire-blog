"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { assertPermission } from "@/server/auth/session";
import { runWorkflow } from "./posts";

/** Drag a scheduled story to another day: keeps its time of day, moves the date. */
export async function reschedule(postId: string, isoDay: string) {
  await assertPermission("post.publish");
  const post = await db.query.posts.findFirst({ where: eq(schema.posts.id, z.uuid().parse(postId)) });
  if (!post || !post.scheduledAt) return { ok: false, error: "Only scheduled stories can be moved." };
  const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(isoDay);
  // Keep the Lagos time of day (UTC+1, no daylight saving).
  const lagos = new Date(post.scheduledAt.getTime() + 3600_000).toISOString().slice(11, 19);
  const next = new Date(`${day}T${lagos}+01:00`);
  return runWorkflow({ postId: post.id, action: "schedule", scheduledAt: next.toISOString() });
}
