"use server";

import { asc, eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { assertPermission } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { slugify } from "@/lib/slug";
import { categoryColours } from "@/styles/tokens";

export type FormState = { ok?: boolean; error?: string; message?: string };

const Cat = z.object({
  id: z.uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Give the theme a name.").max(60),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(300).optional(),
  colour: z.enum(categoryColours),
  seoTitle: z.string().trim().max(120).optional(),
  seoDescription: z.string().trim().max(320).optional(),
});

function refresh() {
  updateTag("categories");
  updateTag("posts");
  updateTag("homepage");
}

export async function saveCategory(_: FormState, form: FormData): Promise<FormState> {
  const user = await assertPermission("taxonomy.manage");
  const parsed = Cat.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const slug = slugify(d.slug || d.name);
  if (!slug) return { error: "That name needs at least one letter or number." };
  const clash = await db.query.categories.findFirst({ where: eq(schema.categories.slug, slug) });
  if (clash && clash.id !== d.id) return { error: `Another theme already uses the address “${slug}”.` };
  const values = { name: d.name, slug, description: d.description || null, colour: d.colour, seoTitle: d.seoTitle || null, seoDescription: d.seoDescription || null };
  if (d.id) {
    const before = await db.query.categories.findFirst({ where: eq(schema.categories.id, d.id) });
    await db.update(schema.categories).set(values).where(eq(schema.categories.id, d.id));
    await audit(user, "category.update", before?.name !== d.name ? `Renamed theme “${before?.name}” to “${d.name}”` : `Edited theme “${d.name}”`, { type: "category", id: d.id });
  } else {
    const [{ max }] = await db.select({ max: sql<number>`coalesce(max(position), 0)::int` }).from(schema.categories);
    const [row] = await db.insert(schema.categories).values({ ...values, position: max + 1 }).returning();
    await audit(user, "category.create", `Created theme “${d.name}”`, { type: "category", id: row.id });
  }
  refresh();
  return { ok: true, message: "Saved." };
}

/** Deleting a theme never orphans stories silently: they move to the theme the owner chooses (or to none). */
export async function deleteCategory(id: string, moveTo: string | null): Promise<FormState> {
  const user = await assertPermission("taxonomy.manage");
  const cat = await db.query.categories.findFirst({ where: eq(schema.categories.id, z.uuid().parse(id)) });
  if (!cat) return { ok: true };
  const target = moveTo ? z.uuid().parse(moveTo) : null;
  if (target === cat.id) return { error: "Choose a different theme to move the stories to." };
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.posts).where(eq(schema.posts.categoryId, cat.id));
  await db.transaction(async (tx) => {
    await tx.update(schema.posts).set({ categoryId: target }).where(eq(schema.posts.categoryId, cat.id));
    await tx.delete(schema.categories).where(eq(schema.categories.id, cat.id));
  });
  await audit(user, "category.delete", `Deleted theme “${cat.name}” and moved ${n} stor${n === 1 ? "y" : "ies"}`, { type: "category", id: cat.id }, { movedTo: target });
  refresh();
  return { ok: true };
}

export async function moveCategory(id: string, direction: -1 | 1) {
  await assertPermission("taxonomy.manage");
  const cats = await db.select().from(schema.categories).orderBy(asc(schema.categories.position), asc(schema.categories.name));
  const i = cats.findIndex((c) => c.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= cats.length) return;
  [cats[i], cats[j]] = [cats[j], cats[i]];
  await Promise.all(cats.map((c, position) => db.update(schema.categories).set({ position }).where(eq(schema.categories.id, c.id))));
  refresh();
}

export async function renameTag(id: string, name: string): Promise<FormState> {
  const user = await assertPermission("taxonomy.manage");
  const n = z.string().trim().min(1).max(40).parse(name).toLowerCase();
  const slug = slugify(n);
  const existing = await db.query.tags.findFirst({ where: eq(schema.tags.slug, slug) });
  if (existing && existing.id !== id) {
    // Merge into the existing tag.
    await db.execute(sql`insert into post_tags (post_id, tag_id) select post_id, ${existing.id} from post_tags where tag_id = ${id} on conflict do nothing`);
    await db.delete(schema.tags).where(eq(schema.tags.id, id));
    await audit(user, "tag.merge", `Merged a tag into “${existing.name}”`, { type: "tag", id: existing.id });
  } else {
    await db.update(schema.tags).set({ name: n, slug }).where(eq(schema.tags.id, z.uuid().parse(id)));
    await audit(user, "tag.rename", `Renamed a tag to “${n}”`, { type: "tag", id });
  }
  refresh();
  return { ok: true };
}

export async function deleteTag(id: string) {
  const user = await assertPermission("taxonomy.manage");
  const tag = await db.query.tags.findFirst({ where: eq(schema.tags.id, z.uuid().parse(id)) });
  if (!tag) return;
  await db.delete(schema.tags).where(eq(schema.tags.id, id));
  await audit(user, "tag.delete", `Deleted tag “${tag.name}”`, { type: "tag", id });
  refresh();
}

const Coll = z.object({ id: z.uuid().optional().or(z.literal("")), name: z.string().trim().min(2, "Give the series a name.").max(80), description: z.string().trim().max(400).optional() });

export async function saveCollection(_: FormState, form: FormData): Promise<FormState> {
  const user = await assertPermission("taxonomy.manage");
  const parsed = Coll.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const slug = slugify(d.name);
  const clash = await db.query.collections.findFirst({ where: eq(schema.collections.slug, slug) });
  if (clash && clash.id !== d.id) return { error: "A series with that name already exists." };
  if (d.id) await db.update(schema.collections).set({ name: d.name, slug, description: d.description || null }).where(eq(schema.collections.id, d.id));
  else await db.insert(schema.collections).values({ name: d.name, slug, description: d.description || null });
  await audit(user, d.id ? "collection.update" : "collection.create", `${d.id ? "Edited" : "Created"} series “${d.name}”`);
  refresh();
  return { ok: true, message: "Saved." };
}

export async function deleteCollection(id: string) {
  const user = await assertPermission("taxonomy.manage");
  const c = await db.query.collections.findFirst({ where: eq(schema.collections.id, z.uuid().parse(id)) });
  if (!c) return;
  await db.delete(schema.collections).where(eq(schema.collections.id, id)); // stories keep existing; their series is cleared
  await audit(user, "collection.delete", `Deleted series “${c.name}” (its stories were kept)`);
  refresh();
}
