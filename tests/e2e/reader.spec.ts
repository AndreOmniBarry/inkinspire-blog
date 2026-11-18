import { expect, test } from "@playwright/test";
import { roleEmail, signIn } from "./helpers";

test("a reader saves a story, finds it in their account, and can download their data @mobile", async ({ page }) => {
  await signIn(page, roleEmail("reader"), { twoFactor: false });
  await expect(page).toHaveURL(/\/account/);
  await page.goto("/stories/two-plates");
  await page.waitForLoadState("networkidle");
  // Idempotent across projects: only save if it isn't saved already.
  if (!(await page.getByRole("button", { name: "Saved" }).first().isVisible())) {
    await page.getByRole("button", { name: "Save for later" }).first().click();
  }
  await expect(page.getByRole("button", { name: "Saved" }).first()).toBeVisible();
  await page.goto("/account");
  await expect(page.locator("#saved").getByRole("link", { name: "Two Plates" })).toBeVisible();
  const res = await page.request.get("/api/account/export");
  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.profile.email).toBe(roleEmail("reader"));
  expect(data.bookmarks.map((b: { story: string }) => b.story)).toContain("Two Plates");
});

test("signed-out visitors are asked to sign in to save, and can't export anyone's data", async ({ page, request }) => {
  await page.goto("/stories/two-plates");
  await page.getByRole("button", { name: "Save for later" }).first().click();
  await expect(page.getByRole("link", { name: "Sign in" }).last()).toBeVisible();
  expect((await request.get("/api/account/export")).status()).toBe(401);
});
