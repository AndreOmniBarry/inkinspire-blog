import { expect, test } from "@playwright/test";
import { roleEmail, signIn } from "./helpers";

test("an editor writes, publishes, and the story appears on the site @mobile", async ({ page }) => {
  await signIn(page, roleEmail("editor"));
  await page.goto("/studio/write/new");
  await page.waitForURL(/\/studio\/write\/[0-9a-f-]{36}/);
  const title = `A test of the morning ${Date.now()}`;
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByRole("textbox", { name: "Story text" }).click();
  await page.keyboard.type("The light came in slowly, the way good news does.");
  await expect(page.getByRole("status").filter({ hasText: /Saved/ })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Publish/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Publish now" }).last().click();
  await expect(page.getByText("Published", { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  await page.goto(`/stories/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText("The light came in slowly")).toBeVisible();
});

test("an author can submit for review but cannot publish", async ({ page }) => {
  await signIn(page, roleEmail("author"));
  await page.goto("/studio/write/new");
  await page.waitForURL(/\/studio\/write\//);
  await page.getByLabel("Title", { exact: true }).fill(`Author draft ${Date.now()}`);
  await page.getByRole("textbox", { name: "Story text" }).click();
  await page.keyboard.type("A first draft.");
  await expect(page.getByRole("status").filter({ hasText: /Saved/ })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Submit/ }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Publish now" })).toHaveCount(0);
  await page.getByRole("dialog").getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("Pending review").first()).toBeVisible({ timeout: 15_000 });
});
