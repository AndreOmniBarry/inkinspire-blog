"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { getSessionUser } from "@/server/auth/session";
import { verifyPassword } from "@/server/security/hash";
import { audit } from "@/server/audit";

export type AccountState = { ok?: boolean; error?: string; message?: string };

export async function updateProfile(_: AccountState, form: FormData): Promise<AccountState> {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");
  const name = z.string().trim().min(2, "Please enter your name.").max(80).safeParse(form.get("name"));
  if (!name.success) return { error: name.error.issues[0].message };
  await db.update(schema.users).set({ name: name.data }).where(eq(schema.users.id, user.id));
  return { ok: true, message: "Saved." };
}

export async function removeBookmark(postId: string) {
  const user = await getSessionUser();
  if (!user) return;
  await db.delete(schema.bookmarks).where(and(eq(schema.bookmarks.userId, user.id), eq(schema.bookmarks.postId, z.uuid().parse(postId))));
}

export async function clearHistory() {
  const user = await getSessionUser();
  if (!user) return;
  await db.delete(schema.readingHistory).where(eq(schema.readingHistory.userId, user.id));
}

/**
 * Right to erasure (NDPA 2023 s.34, GDPR art.17). Confirms the password, then deletes the account and
 * everything tied to it. Payment records are kept without the link to the person, as the law requires
 * financial records to be retained.
 */
export async function deleteMyAccount(_: AccountState, form: FormData): Promise<AccountState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "owner") return { error: "The owner’s account can’t be deleted here. Transfer ownership first." };
  if (String(form.get("confirm")) !== "DELETE") return { error: "Type DELETE to confirm." };
  const account = await db.query.accounts.findFirst({ where: and(eq(schema.accounts.userId, user.id), eq(schema.accounts.providerId, "credential")) });
  if (!account?.password || !(await verifyPassword({ hash: account.password, password: String(form.get("password") ?? "") }))) return { error: "That password isn’t right." };
  await db.transaction(async (tx) => {
    await tx.update(schema.newsletterSubscribers).set({ status: "unsubscribed", unsubscribedAt: new Date(), userId: null }).where(eq(schema.newsletterSubscribers.userId, user.id));
    await tx.delete(schema.users).where(eq(schema.users.id, user.id));
  });
  await audit(null, "account.deleted", "A reader deleted their account");
  const jar = await cookies();
  jar.delete("ink_hint");
  redirect("/?account=deleted");
}
