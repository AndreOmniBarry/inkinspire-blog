import { describe, expect, it } from "vitest";
import { can, matrix, permissions, roles } from "@/server/auth/permissions";

/** The full permissions matrix, asserted cell by cell, so any change to who-can-do-what is deliberate. */
const expected: Record<string, string[]> = {
  owner: [...permissions],
  admin: permissions.filter((p) => !["integrations.manage", "payment.refund", "staff.manage"].includes(p)),
  editor: ["studio.access", "post.create", "post.edit.own", "post.edit.any", "post.submit", "post.publish", "post.delete", "media.upload", "taxonomy.manage", "author.manage", "page.manage", "homepage.manage", "comment.moderate", "newsletter.manage", "analytics.view"],
  author: ["studio.access", "post.create", "post.edit.own", "post.submit", "media.upload"],
  moderator: ["studio.access", "comment.moderate"],
  reader: [],
};

describe("permissions matrix", () => {
  for (const role of roles) {
    for (const p of permissions) {
      it(`${role} ${expected[role].includes(p) ? "can" : "cannot"} ${p}`, () => {
        expect(can(role, p)).toBe(expected[role].includes(p));
      });
    }
  }
  it("has no unknown roles", () => expect(Object.keys(matrix).sort()).toEqual([...roles].sort()));
  it("denies a missing role", () => expect(can(null, "studio.access")).toBe(false));
});
