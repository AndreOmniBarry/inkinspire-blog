import { describe, expect, it } from "vitest";
import { palettes, contrastPairs, themeNames, categoryColours } from "@/styles/tokens";
import { contrastRatio } from "@/lib/colour";

describe("design tokens meet WCAG 2.2 AA in every theme", () => {
  for (const t of themeNames) {
    for (const pair of contrastPairs) {
      it(`${t}: ${pair.fg} on ${pair.bg} (${pair.note})`, () => {
        expect(contrastRatio(palettes[t][pair.fg] as string, palettes[t][pair.bg] as string)).toBeGreaterThanOrEqual(pair.large ? 3 : 4.5);
      });
    }
    for (const c of categoryColours) {
      it(`${t}: ${c} cover text`, () => expect(contrastRatio(palettes[t].categories[c][1], palettes[t].categories[c][0])).toBeGreaterThanOrEqual(4.5));
    }
  }
});
