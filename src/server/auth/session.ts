import "server-only";
import { headers } from "next/headers";
import { forbidden, redirect, unauthorized } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { can, isStaff, type Permission, type Role } from "./permissions";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  mustChangePassword: boolean;
  image: string | null;
};

/**
 * The current signed-in user, or null. Reads the session cookie and the database on every request
 * (no cookie cache), so a suspension or role change applies immediately.
 * Must be called inside a <Suspense> boundary or a dynamic route (it reads request headers).
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: Role; status?: string; mustChangePassword?: boolean; twoFactorEnabled?: boolean | null };
  if (u.status === "suspended") return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: (u.role ?? "reader") as Role,
    emailVerified: u.emailVerified,
    twoFactorEnabled: !!u.twoFactorEnabled,
    mustChangePassword: !!u.mustChangePassword,
    image: u.image ?? null,
  };
});

export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

/**
 * For Studio pages and actions. Staff must have changed their initial password and enrolled in
 * two-step verification before they can do anything else (blueprint §9: 2FA for admin accounts).
 */
export async function requireStaff(permission: Permission = "studio.access", opts: { allowSetup?: boolean } = {}): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/studio");
  if (!isStaff(user.role)) forbidden();
  if (!opts.allowSetup && (user.mustChangePassword || !user.twoFactorEnabled)) redirect("/studio/welcome");
  if (!can(user.role, permission)) forbidden();
  return user;
}

/** For Server Actions and Route Handlers: throws instead of redirecting. */
export async function assertPermission(permission: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) unauthorized();
  if (!isStaff(user.role) || user.mustChangePassword || !user.twoFactorEnabled || !can(user.role, permission)) forbidden();
  return user;
}
