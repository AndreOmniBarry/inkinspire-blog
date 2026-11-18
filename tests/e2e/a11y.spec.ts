import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const paths = ["/", "/stories", "/stories/harmattan-letter", "/stories/on-not-being-asked", "/category/poetry-and-creative-writing", "/about", "/contact", "/search?q=family", "/login", "/register", "/membership", "/legal/privacy", "/authors/xenia"];

for (const theme of ["paper", "sepia", "midnight"]) {
  test(`axe: zero violations in ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("ink:prefs", JSON.stringify({ theme: t, size: 3, font: "serif" })), theme);
    for (const p of paths) {
      await page.goto(p);
      const results = await new AxeBuilder({ page: page as never }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${p}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target}`), `axe violations on ${p}`).toEqual([]);
    }
  });
}
