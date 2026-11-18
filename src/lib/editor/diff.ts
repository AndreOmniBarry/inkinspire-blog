/**
 * Paragraph-level diff for version history: what was added, removed or kept between two versions.
 * LCS over paragraphs (stories are a few hundred paragraphs at most), with a word-level diff inside
 * paragraphs that changed slightly.
 */
export type DiffPart = { kind: "same" | "added" | "removed"; text: string };

function lcs<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean) {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = eq(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: Array<{ kind: "same" | "added" | "removed"; value: T }> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (eq(a[i], b[j])) {
      out.push({ kind: "same", value: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ kind: "removed", value: a[i++] });
    else out.push({ kind: "added", value: b[j++] });
  }
  while (i < n) out.push({ kind: "removed", value: a[i++] });
  while (j < m) out.push({ kind: "added", value: b[j++] });
  return out;
}

export function diffParagraphs(before: string, after: string): DiffPart[] {
  const a = before.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const b = after.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  if (a.length * b.length > 250_000) return [{ kind: "removed", text: before }, { kind: "added", text: after }];
  return lcs(a, b, (x, y) => x === y).map((p) => ({ kind: p.kind, text: p.value }));
}

export function diffWords(before: string, after: string): DiffPart[] {
  const a = before.split(/(\s+)/);
  const b = after.split(/(\s+)/);
  if (a.length * b.length > 400_000) return [{ kind: "removed", text: before }, { kind: "added", text: after }];
  return lcs(a, b, (x, y) => x === y).map((p) => ({ kind: p.kind, text: p.value }));
}
