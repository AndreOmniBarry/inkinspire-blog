"use server";

import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { assertPermission } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { defaultSettings, type SiteSettings } from "@/server/settings";
import { removeDemoContent } from "@/server/demo";
import { can, roles } from "@/server/auth/permissions";

export type SettingsState = { ok?: boolean; error?: string; message?: string };

const url = z.union([z.literal(""), z.url({ message: "Please enter a full web address, starting with https://" })]);
const schemas = {
  identity: z.object({ name: z.string().trim().min(1).max(60), tagline: z.string().trim().max(120), description: z.string().trim().max(400), contactEmail: z.email("Please enter a valid email address.") }),
  socials: z.object({ instagram: url, x: url, facebook: url, linkedin: url, tiktok: url, youtube: url, website: url }),
  seo: z.object({ defaultTitle: z.string().trim().max(120), titleTemplate: z.string().trim().max(60).refine((v) => v.includes("%s"), "The title pattern must include %s where the page title goes."), defaultDescription: z.string().trim().max(320) }),
  community: z.object({ commentsEnabled: z.coerce.boolean(), holdFirstComments: z.coerce.boolean() }),
  membership: z.object({ gracePeriodDays: z.coerce.number().int().min(0).max(30), renewalReminderDays: z.coerce.number().int().min(0).max(30), refundPolicy: z.enum(["keep_until_period_end", "revoke_immediately"]) }),
  maintenance: z.object({ enabled: z.coerce.boolean(), message: z.string().trim().max(300) }),
} satisfies Partial<Record<keyof SiteSettings, z.ZodTypeAny>>;

export async function saveSettings(_: SettingsState, form: FormData): Promise<SettingsState> {
  const section = String(form.get("_section")) as keyof typeof schemas;
  if (!(section in schemas)) return { error: "Unknown settings section." };
  const user = await assertPermission(section === "maintenance" ? "integrations.manage" : "settings.manage");
  const raw: Record<string, unknown> = Object.fromEntries([...form.entries()].filter(([k]) => !k.startsWith("_") && !k.startsWith("$")));
  // Unchecked checkboxes are absent from the form.
  for (const k of ["commentsEnabled", "holdFirstComments", "enabled"]) if (k in (defaultSettings[section] as object)) raw[k] = form.get(k) === "on";
  const parsed = schemas[section].safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const value = section === "socials" ? Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v)) : parsed.data;
  await db.insert(schema.siteSettings).values({ key: section, value, updatedById: user.id }).onConflictDoUpdate({ target: schema.siteSettings.key, set: { value, updatedById: user.id } });
  await audit(user, "settings.update", `Updated ${section} settings`);
  updateTag("settings");
  return { ok: true, message: "Saved." };
}

export async function removeDemo(): Promise<SettingsState> {
  const user = await assertPermission("demo.remove");
  const r = await removeDemoContent();
  await audit(user, "demo.remove", `Removed demo content (${r.stories} stories, ${r.media} images)`);
  updateTag("posts");
  updateTag("homepage");
  updateTag("categories");
  return { ok: true, message: `Removed ${r.stories} demo stories. Your themes, pages and settings are untouched.` };
}

export async function setRole(userId: string, role: string): Promise<SettingsState> {
  const actor = await assertPermission("staff.manage");
  const r = z.enum(roles).parse(role);
  const target = await db.query.users.findFirst({ where: eq(schema.users.id, z.uuid().parse(userId)) });
  if (!target) return { error: "That person no longer exists." };
  if (target.id === actor.id) return { error: "You can’t change your own role." };
  if (r === "owner" && !can(actor.role, "staff.manage")) return { error: "Only the owner can do that." };
  await db.update(schema.users).set({ role: r }).where(eq(schema.users.id, target.id));
  await audit(actor, "staff.role", `Changed ${target.email}’s role from ${target.role} to ${r}`, { type: "user", id: target.id });
  return { ok: true };
}

const Invite = z.object({ name: z.string().trim().min(2).max(80), email: z.email(), role: z.enum(["admin", "editor", "author", "moderator"]) });

/**
 * Invite a team member: creates their account (no password yet) and emails a link to choose one.
 * On first sign-in they must turn on two-step verification before the Studio opens.
 */
export async function inviteStaff(_: SettingsState, form: FormData): Promise<SettingsState> {
  const actor = await assertPermission("staff.manage");
  const parsed = Invite.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, role } = parsed.data;
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email.toLowerCase()) });
  const { randomBytes } = await import("node:crypto");
  const { hashPassword } = await import("@/server/security/hash");
  if (existing) {
    if (existing.role !== "reader") return { error: "That person already has a Studio role." };
    await db.update(schema.users).set({ role }).where(eq(schema.users.id, existing.id));
  } else {
    const [u] = await db.insert(schema.users).values({ name, email: email.toLowerCase(), emailVerified: true, role }).returning();
    await db.insert(schema.accounts).values({ accountId: u.id, providerId: "credential", userId: u.id, password: await hashPassword(randomBytes(32).toString("base64url")) });
  }
  const { auth } = await import("@/server/auth/auth");
  await auth.api.requestPasswordReset({ body: { email: email.toLowerCase(), redirectTo: "/reset-password" } });
  await audit(actor, "staff.invite", `Invited ${email} as ${role}`);
  return { ok: true, message: `Invitation sent to ${email}. They’ll choose a password, then set up two-step verification.` };
}
