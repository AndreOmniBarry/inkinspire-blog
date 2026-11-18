import { expect, test } from "@playwright/test";
import { roleEmail, signIn } from "./helpers";

/** Server-side enforcement: each role is refused the Studio pages it may not use. */
const pages: Array<[string, string[]]> = [
  ["/studio/settings", ["owner", "admin"]],
  ["/studio/audit", ["owner", "admin"]],
  ["/studio/taxonomy", ["owner", "admin", "editor"]],
  ["/studio/homepage", ["owner", "admin", "editor"]],
  ["/studio/library", ["owner", "admin", "editor", "author"]],
];

for (const role of ["owner", "admin", "editor", "author", "moderator", "reader"]) {
  test(`permissions matrix: ${role}`, async ({ page }) => {
    await signIn(page, roleEmail(role), { twoFactor: role !== "reader" });
    for (const [path, allowed] of pages) {
      const res = await page.goto(path);
      if (allowed.includes(role)) expect(res?.status(), `${role} should open ${path}`).toBe(200);
      else expect([403, 404, 401], `${role} must be refused ${path} (got ${res?.status()})`).toContain(res?.status());
    }
  });
}
