/**
 * Screenshots of the Studio for docs/ADMIN-GUIDE.md, signed in as the e2e test owner.
 * Run against the e2e server:  BASE_URL=http://localhost:3200 npx tsx scripts/studio-screenshots.ts
 */
import { chromium, devices } from "@playwright/test";
import { createOTP } from "@better-auth/utils/otp";

const base = process.env.BASE_URL ?? "http://localhost:3200";
const out = "docs/screenshots";
const browser = await chromium.launch();

async function signedIn(ctxOpts: Parameters<typeof browser.newContext>[0]) {
  const ctx = await browser.newContext({ ...ctxOpts, reducedMotion: "reduce" });
  await ctx.addInitScript(() => localStorage.setItem("ink:prefs", JSON.stringify({ theme: "paper", size: 3, font: "serif" })));
  const page = await ctx.newPage();
  await page.goto(`${base}/login`);
  await page.getByLabel("Email address").fill("owner@test.inkinspire.local");
  await page.getByLabel("Password", { exact: true }).fill("Quiet-river-at-dawn-42");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByLabel("6-digit code").fill(await createOTP("inkinspire-test-totp-secret-0001", { digits: 6, period: 30 }).totp());
  await page.getByRole("button", { name: "Verify and sign in" }).click();
  await page.waitForURL(/\/studio/);
  return { ctx, page };
}

const desk = await signedIn({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const shots: Array<[string, string]> = [
  ["/studio", "studio-overview"],
  ["/studio/library", "studio-library"],
  ["/studio/calendar", "studio-calendar"],
  ["/studio/homepage", "studio-homepage"],
  ["/studio/taxonomy", "studio-taxonomy"],
  ["/studio/pages", "studio-pages"],
  ["/studio/settings", "studio-settings"],
];
for (const [path, name] of shots) {
  await desk.page.goto(base + path, { waitUntil: "load" });
  await desk.page.waitForTimeout(1200);
  await desk.page.screenshot({ path: `${out}/${name}.png` });
}
// The editor, on a real demo poem.
await desk.page.goto(`${base}/studio/library?q=Harmattan`, { waitUntil: "load" });
await desk.page.getByRole("link", { name: "Harmattan Letter" }).first().click();
await desk.page.waitForURL(/\/studio\/write\//);
await desk.page.waitForTimeout(1500);
await desk.page.screenshot({ path: `${out}/studio-editor.png` });
await desk.page.getByRole("button", { name: /Update|Publish/ }).click();
await desk.page.waitForTimeout(1500);
await desk.page.screenshot({ path: `${out}/studio-publish-checklist.png` });
await desk.ctx.close();

// Phone
const phone = await signedIn({ ...devices["Pixel 7"] });
await phone.page.goto(`${base}/studio`, { waitUntil: "load" });
await phone.page.screenshot({ path: `${out}/studio-phone-overview.png` });
await phone.page.goto(`${base}/studio/write/new`);
await phone.page.waitForURL(/\/studio\/write\/[0-9a-f-]{36}/);
await phone.page.getByLabel("Title", { exact: true }).fill("Notes from the bus stop");
await phone.page.getByRole("textbox", { name: "Story text" }).click();
await phone.page.keyboard.type("The rain came late this year, and everyone at the bus stop had an opinion about it.");
await phone.page.waitForTimeout(3500);
await phone.page.screenshot({ path: `${out}/studio-phone-editor.png` });
await phone.ctx.close();
await browser.close();
console.log("Studio screenshots written to docs/screenshots/");
