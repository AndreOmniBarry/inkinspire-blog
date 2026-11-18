import { expect, test } from "@playwright/test";

const paths = ["/", "/stories", "/stories/harmattan-letter", "/category/poetry-and-creative-writing", "/membership", "/about", "/contact", "/search?q=family", "/authors/xenia"];

/** Brief §2.4: a considered 360 px experience: no horizontal scroll, menu reachable, 44 px targets. */
for (const theme of ["paper", "midnight"]) {
  test(`360 px: no horizontal scroll and a working menu (${theme})`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 760 }, hasTouch: true, isMobile: true });
    await ctx.addInitScript((t) => localStorage.setItem("ink:prefs", JSON.stringify({ theme: t })), theme);
    const page = await ctx.newPage();
    for (const p of paths) {
      await page.goto(p);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${p} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0);
      const menu = page.getByRole("button", { name: "Open menu" });
      await expect(menu, `${p}: menu button visible`).toBeInViewport();
      const box = await menu.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Stories" })).toBeVisible();
    await ctx.close();
  });
}
