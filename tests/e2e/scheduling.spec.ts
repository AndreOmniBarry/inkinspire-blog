import { expect, test } from "@playwright/test";
import postgres from "postgres";

/**
 * ADR-005: a scheduled story appears at its time even if no job has run. We schedule a story for
 * 5 seconds from now directly in the database, with the cron never called, and watch it appear.
 */
test("scheduled publishing is exact and needs no background job", async ({ page }) => {
  const sql = postgres(process.env.E2E_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/inkinspire_test", { max: 1 });
  const slug = `scheduled-${Date.now()}`;
  const [cat] = await sql`select id from categories limit 1`;
  await sql`insert into posts (id, slug, title, status, visibility, preview_html, body_html, search_text, category_id, scheduled_at)
    values (gen_random_uuid(), ${slug}, 'A story with perfect timing', 'scheduled', 'free', '<p>On time.</p>', '<p>On time.</p>', 'On time.', ${cat.id}, now() + interval '5 seconds')`;
  await sql.end();
  const before = await page.request.get(`/stories/${slug}`);
  expect(before.status()).toBe(404);
  await page.waitForTimeout(7000);
  await page.goto(`/stories/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name: "A story with perfect timing" })).toBeVisible();
});
