import type { Permission } from "@/server/auth/permissions";

export type NavItem = { href: string; label: string; icon: string; permission: Permission; group: "Publish" | "Audience" | "Business" | "Site"; ready: boolean };

/** Every Studio module (`ready: false` = arrives in a later phase; hidden until it works), in plain language. Shown only to roles that can use it (and enforced server-side). */
export const studioNav: NavItem[] = [
  { href: "/studio", label: "Overview", icon: "LayoutDashboard", permission: "studio.access", group: "Publish" , ready: true },
  { href: "/studio/library", label: "Stories", icon: "BookOpen", permission: "post.create", group: "Publish" , ready: true },
  { href: "/studio/calendar", label: "Calendar", icon: "CalendarDays", permission: "post.publish", group: "Publish" , ready: true },
  { href: "/studio/media", label: "Media", icon: "Images", permission: "media.upload", group: "Publish" , ready: true },
  { href: "/studio/taxonomy", label: "Themes & tags", icon: "Tags", permission: "taxonomy.manage", group: "Publish" , ready: true },
  { href: "/studio/authors", label: "Authors", icon: "Feather", permission: "author.manage", group: "Publish" , ready: true },
  { href: "/studio/homepage", label: "Homepage", icon: "Home", permission: "homepage.manage", group: "Site" , ready: true },
  { href: "/studio/pages", label: "Pages", icon: "FileText", permission: "page.manage", group: "Site" , ready: true },
  { href: "/studio/comments", label: "Comments", icon: "MessageSquare", permission: "comment.moderate", group: "Audience" , ready: false },
  { href: "/studio/readers", label: "Readers", icon: "Users", permission: "reader.view", group: "Audience" , ready: false },
  { href: "/studio/newsletter", label: "Newsletter", icon: "Mail", permission: "newsletter.manage", group: "Audience" , ready: false },
  { href: "/studio/inbox", label: "Inbox", icon: "Inbox", permission: "reader.view", group: "Audience" , ready: true },
  { href: "/studio/analytics", label: "Analytics", icon: "BarChart3", permission: "analytics.view", group: "Audience" , ready: false },
  { href: "/studio/memberships", label: "Memberships", icon: "Gem", permission: "membership.manage", group: "Business" , ready: false },
  { href: "/studio/payments", label: "Payments", icon: "Receipt", permission: "payment.view", group: "Business" , ready: false },
  { href: "/studio/settings", label: "Settings", icon: "Settings", permission: "settings.manage", group: "Site" , ready: true },
  { href: "/studio/security", label: "Security", icon: "ShieldCheck", permission: "studio.access", group: "Site" , ready: true },
  { href: "/studio/audit", label: "Activity log", icon: "History", permission: "audit.view", group: "Site" , ready: true },
];
