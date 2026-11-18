/**
 * `pnpm check:contrast`: WCAG 2.2 contrast for every declared pair in every theme.
 * 4.5:1 for text, 3:1 for large text and non-text UI. Exits non-zero on any failure.
 */
import { palettes, themeNames, contrastPairs, categoryColours } from "../src/styles/tokens";
import { contrastRatio } from "../src/lib/colour";

let failures = 0;
const rows: string[] = [];

for (const theme of themeNames) {
  const p = palettes[theme];
  const check = (fgName: string, fg: string, bgName: string, bg: string, min: number, note: string) => {
    const ratio = contrastRatio(fg, bg);
    const ok = ratio >= min;
    if (!ok) failures++;
    rows.push(
      `${ok ? "PASS" : "FAIL"}  ${theme.padEnd(9)} ${fgName.padEnd(22)} on ${bgName.padEnd(16)} ${ratio.toFixed(2).padStart(5)}:1  (min ${min})  ${note}`,
    );
  };
  for (const pair of contrastPairs) {
    check(pair.fg, p[pair.fg] as string, pair.bg, p[pair.bg] as string, pair.large ? 3 : 4.5, pair.note);
  }
  for (const c of categoryColours) {
    const [bg, ink] = p.categories[c];
    check(`cat-${c}-ink`, ink, `cat-${c}-bg`, bg, 4.5, "typographic cover text");
  }
}

console.log(rows.join("\n"));
console.log(`\n${rows.length - failures}/${rows.length} pairs pass.`);
if (failures) {
  console.error(`${failures} contrast failure(s).`);
  process.exit(1);
}
