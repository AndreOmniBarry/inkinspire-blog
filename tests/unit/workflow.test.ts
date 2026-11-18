import { describe, expect, it } from "vitest";
import { transition, type Action, type Status } from "@/server/content/workflow";

const now = new Date("2026-11-18T12:00:00Z");
const future = new Date("2026-11-20T09:00:00Z");

describe("publishing workflow", () => {
  it("author submits a draft for review", () => {
    expect(transition({ from: "draft", action: "submit", role: "author", isOwnPost: true, now })).toEqual({ ok: true, to: "pending_review" });
  });
  it("author cannot publish or schedule", () => {
    expect(transition({ from: "draft", action: "publish", role: "author", isOwnPost: true, now }).ok).toBe(false);
    expect(transition({ from: "draft", action: "schedule", role: "author", isOwnPost: true, scheduledAt: future, now }).ok).toBe(false);
  });
  it("author cannot touch someone else's story", () => {
    expect(transition({ from: "draft", action: "submit", role: "author", isOwnPost: false, now }).ok).toBe(false);
  });
  it("editor approves and publishes a submitted story", () => {
    expect(transition({ from: "pending_review", action: "publish", role: "editor", isOwnPost: false, now })).toMatchObject({ ok: true, to: "published", setPublishedAt: true });
  });
  it("editor sends a story back with changes requested", () => {
    expect(transition({ from: "pending_review", action: "request_changes", role: "editor", isOwnPost: false, now })).toMatchObject({ ok: true, to: "draft" });
  });
  it("scheduling needs a future time", () => {
    expect(transition({ from: "draft", action: "schedule", role: "owner", isOwnPost: true, scheduledAt: new Date(now.getTime() - 1000), now }).ok).toBe(false);
    expect(transition({ from: "draft", action: "schedule", role: "owner", isOwnPost: true, scheduledAt: null, now }).ok).toBe(false);
    expect(transition({ from: "draft", action: "schedule", role: "owner", isOwnPost: true, scheduledAt: future, now })).toEqual({ ok: true, to: "scheduled" });
  });
  it("published stories can be archived and restored, keeping their URL", () => {
    expect(transition({ from: "published", action: "archive", role: "owner", isOwnPost: true, now })).toMatchObject({ ok: true, to: "archived" });
    expect(transition({ from: "archived", action: "restore", role: "owner", isOwnPost: true, now })).toMatchObject({ ok: true, to: "published" });
  });
  it("moderators and readers cannot change stories", () => {
    for (const role of ["moderator", "reader"] as const) expect(transition({ from: "draft", action: "save_draft", role, isOwnPost: true, now }).ok).toBe(false);
  });
  it("rejects impossible transitions", () => {
    const impossible: Array<[Status, Action]> = [["archived", "submit"], ["published", "submit"], ["draft", "restore"], ["draft", "unpublish"]];
    for (const [from, action] of impossible) expect(transition({ from, action, role: "owner", isOwnPost: true, now }).ok).toBe(false);
  });
});
