"use server";

import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db, schema } from "@/server/db";
import { getSessionUser } from "@/server/auth/session";
import { auth } from "@/server/auth/auth";
import { audit } from "@/server/audit";

/** QR code for the authenticator app, rendered on the server as SVG (no third-party QR service). */
export async function totpQr(uri: string): Promise<string> {
  const user = await getSessionUser();
  if (!user || !uri.startsWith("otpauth://totp/")) throw new Error("Not allowed");
  return QRCode.toString(uri, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1B1A17", light: "#FFFDF9" } });
}

/** Called after the staff member has changed their initial password through Better Auth. */
export async function markPasswordChanged() {
  const user = await getSessionUser();
  if (!user) throw new Error("Not signed in");
  await db.update(schema.users).set({ mustChangePassword: false }).where(eq(schema.users.id, user.id));
  await db.insert(schema.loginEvents).values({ userId: user.id, event: "password_changed" });
  await audit(user, "account.password_changed", "Changed their password");
}

export async function recordTwoFactorEnabled() {
  const user = await getSessionUser();
  if (!user) throw new Error("Not signed in");
  await audit(user, "account.2fa_enabled", "Turned on two-step verification");
}

export async function revokeSession(token: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not signed in");
  await auth.api.revokeSession({ headers: await headers(), body: { token } });
  await audit(user, "account.session_revoked", "Signed out a device");
}
