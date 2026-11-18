/**
 * Role-based permissions (blueprint §10). This table is the only place capabilities are granted.
 * Every Server Action and Route Handler calls `can()` / `requirePermission()` on the server;
 * the UI uses the same table only to decide what to show.
 *
 * Premium membership is an entitlement, not a role (see src/server/billing/entitlements.ts).
 */
export const roles = ["owner", "admin", "editor", "author", "moderator", "reader"] as const;
export type Role = (typeof roles)[number];

export const permissions = [
  "studio.access",
  "post.create",
  "post.edit.own",
  "post.edit.any",
  "post.submit",
  "post.publish", // publish, schedule, approve, archive, unpublish
  "post.delete",
  "media.upload",
  "media.delete",
  "taxonomy.manage",
  "author.manage",
  "page.manage",
  "homepage.manage",
  "comment.moderate",
  "reader.view",
  "reader.manage", // suspend, verify, delete, export
  "newsletter.manage",
  "membership.manage",
  "payment.view",
  "payment.refund",
  "analytics.view",
  "settings.manage",
  "integrations.manage", // API keys, payment provider, maintenance mode
  "staff.manage", // change roles
  "audit.view",
  "demo.remove",
] as const;
export type Permission = (typeof permissions)[number];

const all = new Set<Permission>(permissions);

export const matrix: Record<Role, ReadonlySet<Permission>> = {
  owner: all,
  admin: new Set<Permission>(
    permissions.filter((p) => p !== "integrations.manage" && p !== "payment.refund" && p !== "staff.manage"),
  ),
  editor: new Set<Permission>([
    "studio.access",
    "post.create",
    "post.edit.own",
    "post.edit.any",
    "post.submit",
    "post.publish",
    "post.delete",
    "media.upload",
    "taxonomy.manage",
    "author.manage",
    "page.manage",
    "homepage.manage",
    "comment.moderate",
    "newsletter.manage",
    "analytics.view",
  ]),
  author: new Set<Permission>(["studio.access", "post.create", "post.edit.own", "post.submit", "media.upload"]),
  moderator: new Set<Permission>(["studio.access", "comment.moderate"]),
  reader: new Set<Permission>(),
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return matrix[role]?.has(permission) ?? false;
}

export const staffRoles: Role[] = ["owner", "admin", "editor", "author", "moderator"];
export const isStaff = (role: Role | null | undefined) => !!role && role !== "reader";

/** Plain-language names for the Studio. */
export const roleLabels: Record<Role, { name: string; description: string }> = {
  owner: { name: "Owner", description: "Everything, including payments, integrations and staff." },
  admin: { name: "Administrator", description: "Runs the publication; cannot change keys, refunds or staff." },
  editor: { name: "Editor", description: "All stories, pages, homepage, newsletter and comments." },
  author: { name: "Author", description: "Writes their own stories and submits them for review." },
  moderator: { name: "Moderator", description: "Reviews and moderates comments only." },
  reader: { name: "Reader", description: "A registered reader. No Studio access." },
};
