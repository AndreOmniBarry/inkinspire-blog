"use server";

import { eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { assertPermission } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { slugify } from "@/lib/slug";
import { getStorage } from "@/server/media/storage";

export type PState = { ok?: boolean; error?: string; message?: string };
const url = z.union([z.literal(""), z.url()]);
const Author = z.object({
  id: z.uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(80).optional(),
  tagline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(1500).optional(),
  photoMediaId: z.uuid().optional().or(z.literal("")),
  instagram: url, x: url, facebook: url, linkedin: url, website: url,
});

export async function saveAuthor(_: PState, form: FormData): Promise<PState> {
  const user = await assertPermission("author.manage");
  const p = Author.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const d = p.data;
  const slug = slugify(d.slug || d.name);
  const clash = await db.query.authors.findFirst({ where: eq(schema.authors.slug, slug) });
  if (clash && clash.id !== d.id) return { error: "Another author already uses that address." };
  const socials = Object.fromEntries(Object.entries({ instagram: d.instagram, x: d.x, facebook: d.facebook, linkedin: d.linkedin, website: d.website }).filter(([, v]) => v));
  const values = { name: d.name, slug, tagline: d.tagline || null, bio: d.bio || null, photoMediaId: d.photoMediaId || null, socials };
  if (d.id) await db.update(schema.authors).set(values).where(eq(schema.authors.id, d.id));
  else await db.insert(schema.authors).values(values);
  await audit(user, d.id ? "author.update" : "author.create", `${d.id ? "Updated" : "Added"} author “${d.name}”`);
  updateTag("authors");
  updateTag("posts");
  return { ok: true, message: "Saved." };
}

export async function deleteAuthor(id: string): Promise<PState> {
  const user = await assertPermission("author.manage");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.postAuthors).where(eq(schema.postAuthors.authorId, z.uuid().parse(id)));
  if (n > 0) return { error: `This author has ${n} stor${n === 1 ? "y" : "ies"}. Move them to another author first.` };
  const a = await db.query.authors.findFirst({ where: eq(schema.authors.id, id) });
  await db.delete(schema.authors).where(eq(schema.authors.id, id));
  await audit(user, "author.delete", `Removed author “${a?.name}”`);
  updateTag("authors");
  return { ok: true };
}

export async function updateMedia(id: string, patch: { alt?: string; caption?: string; credit?: string; focalX?: number; focalY?: number }) {
  const user = await assertPermission("media.upload");
  const d = z.object({ alt: z.string().trim().min(1, "Alt text can’t be empty.").max(500).optional(), caption: z.string().max(500).optional(), credit: z.string().max(200).optional(), focalX: z.number().int().min(0).max(100).optional(), focalY: z.number().int().min(0).max(100).optional() }).parse(patch);
  await db.update(schema.media).set(d).where(eq(schema.media.id, z.uuid().parse(id)));
  await audit(user, "media.update", "Updated an image’s details", { type: "media", id });
  updateTag("posts");
  return { ok: true };
}

/** Safe delete: an image used as a cover, in a story, or as an author photo can’t be deleted. */
export async function deleteMedia(id: string): Promise<PState> {
  const user = await assertPermission("media.delete");
  const m = await db.query.media.findFirst({ where: eq(schema.media.id, z.uuid().parse(id)) });
  if (!m) return { ok: true };
  const [{ n }] = await db.execute<{ n: number }>(sql`select (
      (select count(*) from posts where cover_media_id = ${id}) +
      (select count(*) from posts where content_json::text like ${`%${id}%`}) +
      (select count(*) from authors where photo_media_id = ${id}) +
      (select count(*) from collections where cover_media_id = ${id})
    )::int as n`);
  if (n > 0) return { error: `This image is used in ${n} place${n === 1 ? "" : "s"}. Remove it there first.` };
  await db.delete(schema.media).where(eq(schema.media.id, id));
  const storage = getStorage();
  for (const k of new Set([m.key, ...Object.values(m.variants).flatMap((v) => Object.values(v))])) await storage.remove(k).catch(() => {});
  await audit(user, "media.delete", `Deleted image “${m.filename}”`);
  return { ok: true };
}
