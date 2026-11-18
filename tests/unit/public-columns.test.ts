import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Premium protection (blueprint 7.6): public, cacheable code must never read the protected body.
 * Only src/server/content/protected.ts (request-time, entitlement-checked) and Studio code may.
 */
describe("public modules never select the protected body", () => {
  for (const f of ["src/server/content/public.ts", "src/server/content/search.ts", "src/app/feed.xml/route.ts", "src/app/sitemap.ts", "src/lib/og.tsx"]) {
    it(f, () => {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/bodyHtml|body_html|contentJson|content_json/);
    });
  }
});
