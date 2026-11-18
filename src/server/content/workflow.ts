/**
 * Publishing workflow (blueprint 4.2): Draft → Pending Review → Scheduled → Published → Archived.
 * Pure and fully unit-tested; Server Actions call `transition()` and then persist.
 */
import { can, type Role } from "@/server/auth/permissions";

export type Status = "draft" | "pending_review" | "scheduled" | "published" | "archived";
export type Action = "save_draft" | "submit" | "request_changes" | "schedule" | "publish" | "unpublish" | "archive" | "restore";

export type TransitionInput = {
  from: Status;
  action: Action;
  role: Role;
  isOwnPost: boolean;
  scheduledAt?: Date | null;
  now?: Date;
};

export type TransitionResult =
  | { ok: true; to: Status; setPublishedAt?: boolean; clearSchedule?: boolean }
  | { ok: false; reason: string };

const allowed: Record<Action, Status[]> = {
  save_draft: ["draft", "pending_review"],
  submit: ["draft"],
  request_changes: ["pending_review", "scheduled"],
  schedule: ["draft", "pending_review", "scheduled", "published"],
  publish: ["draft", "pending_review", "scheduled", "archived"],
  unpublish: ["published", "scheduled"],
  archive: ["published", "scheduled", "draft", "pending_review"],
  restore: ["archived"],
};

export function transition(i: TransitionInput): TransitionResult {
  const now = i.now ?? new Date();
  if (!allowed[i.action].includes(i.from)) {
    return { ok: false, reason: `A ${label(i.from).toLowerCase()} story can’t be ${verb(i.action)}.` };
  }
  const canEdit = can(i.role, "post.edit.any") || (i.isOwnPost && can(i.role, "post.edit.own"));
  if (!canEdit) return { ok: false, reason: "You don’t have permission to change this story." };

  const publisher = can(i.role, "post.publish");
  switch (i.action) {
    case "save_draft":
      return { ok: true, to: i.from };
    case "submit":
      if (!can(i.role, "post.submit")) return { ok: false, reason: "You can’t submit stories for review." };
      return { ok: true, to: "pending_review" };
    case "request_changes":
      if (!publisher) return { ok: false, reason: "Only editors can request changes." };
      return { ok: true, to: "draft", clearSchedule: true };
    case "schedule": {
      if (!publisher) return { ok: false, reason: "Only editors can schedule stories. Submit it for review instead." };
      if (!i.scheduledAt) return { ok: false, reason: "Choose a date and time to publish." };
      if (i.scheduledAt.getTime() <= now.getTime() + 30_000) return { ok: false, reason: "Choose a time in the future, or publish now." };
      return { ok: true, to: "scheduled" };
    }
    case "publish":
      if (!publisher) return { ok: false, reason: "Only editors can publish. Submit it for review instead." };
      return { ok: true, to: "published", setPublishedAt: true, clearSchedule: true };
    case "unpublish":
      if (!publisher) return { ok: false, reason: "Only editors can unpublish stories." };
      return { ok: true, to: "draft", clearSchedule: true };
    case "archive":
      if (!publisher) return { ok: false, reason: "Only editors can archive stories." };
      return { ok: true, to: "archived", clearSchedule: true };
    case "restore":
      if (!publisher) return { ok: false, reason: "Only editors can restore stories." };
      return { ok: true, to: "published" };
  }
}

export function label(s: Status): string {
  return { draft: "Draft", pending_review: "Pending review", scheduled: "Scheduled", published: "Published", archived: "Archived" }[s];
}

function verb(a: Action): string {
  return {
    save_draft: "saved as a draft",
    submit: "submitted for review",
    request_changes: "sent back for changes",
    schedule: "scheduled",
    publish: "published",
    unpublish: "unpublished",
    archive: "archived",
    restore: "restored",
  }[a];
}
