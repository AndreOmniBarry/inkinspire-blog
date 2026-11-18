/**
 * `pnpm screenshots [path ...]`: captures pages at 360, 390, 768, 1024 and 1440 px in the
 * Paper, Sepia and Midnight themes, for design review. Output: screenshots/<page>/<theme>-<width>.png
 * Env: BASE_URL (default http://localhost:3000), WIDTHS, THEMES, FULL=1 for full-page captures.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const widths = (process.env.WIDTHS ?? "360,390,768,1024,1440").split(",").map(Number);
const themes = (process.env.THEMES ?? "paper,sepia,midnight").split(",");
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ["/"];
const out = process.env.OUT ?? "screenshots";

const browser = await chromium.launch();
for (const path of paths) {
  const dir = join(out, path === "/" ? "home" : path.replace(/^\//, "").replace(/[/?=&]/g, "_"));
  mkdirSync(dir, { recursive: true });
  for (const theme of themes) {
    const ctx = await browser.newContext({ deviceScaleFactor: 1, reducedMotion: "reduce" });
    await ctx.addInitScript((t) => localStorage.setItem("ink:prefs", JSON.stringify({ theme: t, size: 3, font: "serif" })), theme);
    await ctx.addCookies([{ name: "ink_consent", value: encodeURIComponent(JSON.stringify({ analytics: false, v: 1 })), url: base }]);
    const page = await ctx.newPage();
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: w < 768 ? 800 : 900 });
      await page.goto(base + path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: join(dir, `${theme}-${w}.png`), fullPage: process.env.FULL === "1" });
    }
    await ctx.close();
  }
  console.log(`✓ ${path}`);
}
await browser.close();
