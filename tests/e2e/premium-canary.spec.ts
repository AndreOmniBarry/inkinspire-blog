import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { CANARY, roleEmail, signIn } from "./helpers";

/**
 * Blueprint 7.6 / brief 7.5: the protected part of a premium story must reach ONLY an entitled
 * reader, across the HTML, the React Server Component payload and every public endpoint.
 * This test blocks merges.
 */
const STORY = "/stories/canary-premium-story";

async function fetchAll(request: APIRequestContext) {
  const out: Record<string, string> = {};
  out.html = await (await request.get(STORY)).text();
  out.rsc = await (await request.get(STORY, { headers: { RSC: "1" } })).text();
  out.search = await (await request.get(`/search?q=${encodeURIComponent("protected part says")}`)).text();
  out.feed = await (await request.get("/feed.xml")).text();
  out.sitemap = await (await request.get("/sitemap.xml")).text();
  out.home = await (await request.get("/")).text();
  out.stories = await (await request.get("/stories")).text();
  // The share image lives at a hashed address; read it from the page's og:image tag.
  const ogUrl = /<meta property="og:image" content="([^"]+)"/.exec(out.html)?.[1];
  expect(ogUrl, "story page must declare an og:image").toBeTruthy();
  const og = await request.get(new URL(ogUrl!).pathname + new URL(ogUrl!).search);
  expect(og.status(), "og:image must load").toBe(200);
  out.og = (await og.body()).toString("latin1");
  return out;
}

async function storyText(page: Page) {
  await page.goto(STORY);
  await page.waitForLoadState("networkidle");
  return page.content();
}

test.describe("premium canary", () => {
  test("anonymous visitors never receive the protected text", async ({ request, page }) => {
    const all = await fetchAll(request);
    for (const [where, body] of Object.entries(all)) expect(body, `leaked in ${where}`).not.toContain(CANARY);
    expect(all.html).toContain("PUBLIC-PREVIEW-MARKER");
    // Searching for the protected words finds nothing: they were never indexed.
    const search = await (await request.get(`/search?q=${CANARY}`)).text();
    expect(search).toContain("Nothing found");
    const html = await storyText(page);
    expect(html).not.toContain(CANARY);
    await expect(page.getByRole("heading", { name: /The rest of this story is for members/ })).toBeVisible();
  });

  test("a signed-in free reader does not receive it", async ({ page }) => {
    await signIn(page, roleEmail("reader"), { twoFactor: false });
    const html = await storyText(page);
    expect(html).not.toContain(CANARY);
    const rsc = await page.request.get(STORY, { headers: { RSC: "1" } });
    expect(await rsc.text()).not.toContain(CANARY);
    await expect(page.getByRole("heading", { name: /for members/ })).toBeVisible();
  });

  test("an expired member does not receive it, and is invited to renew", async ({ page }) => {
    await signIn(page, "expired@test.inkinspire.local", { twoFactor: false });
    const html = await storyText(page);
    expect(html).not.toContain(CANARY);
    await expect(page.getByRole("heading", { name: /membership has ended/ })).toBeVisible();
  });

  test("an active member receives it", async ({ page }) => {
    await signIn(page, "member@test.inkinspire.local", { twoFactor: false });
    const html = await storyText(page);
    expect(html).toContain(CANARY);
  });

  test("the anonymous page is not poisoned by a member's visit (no shared cache of personal output)", async ({ browser, request }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await signIn(page, "member@test.inkinspire.local", { twoFactor: false });
    await storyText(page);
    await ctx.close();
    const again = await fetchAll(request);
    for (const [where, body] of Object.entries(again)) expect(body, `leaked in ${where} after a member visit`).not.toContain(CANARY);
  });
});
