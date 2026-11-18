/**
 * Branded, client-safe email layout (tables, inline styles, light/dark aware).
 * Matches the site: paper background, Fraunces-style serif headings (with Georgia fallback,
 * since most email clients cannot load web fonts), oxblood accent, gilt ornament.
 */
export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type EmailButton = { label: string; url: string };

export function emailLayout(opts: {
  preheader: string;
  heading: string;
  paragraphs: string[]; // plain text, escaped here
  button?: EmailButton;
  after?: string[]; // small print under the button
  footerHtml?: string; // pre-escaped (unsubscribe links etc.)
  siteUrl: string;
  siteName?: string;
}): string {
  const name = esc(opts.siteName ?? "Inkinspire");
  const p = opts.paragraphs
    .map(
      (t) =>
        `<p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.65;color:#1B1A17">${esc(t)}</p>`,
    )
    .join("");
  const button = opts.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="border-radius:999px;background:#7A1F2B"><a href="${esc(opts.button.url)}" style="display:inline-block;padding:14px 28px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;letter-spacing:0.02em;color:#FFFDF9;text-decoration:none;border-radius:999px">${esc(opts.button.label)}</a></td></tr></table>
       <p style="margin:0 0 18px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#6A6358">If the button does not work, copy this link into your browser:<br><a href="${esc(opts.button.url)}" style="color:#7A1F2B;word-break:break-all">${esc(opts.button.url)}</a></p>`
    : "";
  const after = (opts.after ?? [])
    .map(
      (t) =>
        `<p style="margin:0 0 12px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#6A6358">${esc(t)}</p>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>${esc(opts.heading)}</title>
<style>
@media (prefers-color-scheme: dark){
  .ink-bg{background:#14120F !important}.ink-card{background:#1C1915 !important;border-color:#332E27 !important}
  .ink-card p,.ink-card h1{color:#EDE6D8 !important}.ink-card a{color:#D98A93 !important}
}
@media (max-width:620px){.ink-card{padding:28px 22px !important}}
</style></head>
<body style="margin:0;padding:0;background:#FAF6EF" class="ink-bg">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="ink-bg" style="background:#FAF6EF"><tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">
    <tr><td style="padding:0 8px 20px;font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:0.01em;color:#1B1A17"><a href="${esc(opts.siteUrl)}" style="color:#1B1A17;text-decoration:none">${name}</a></td></tr>
    <tr><td class="ink-card" style="background:#FFFDF9;border:1px solid #E4DCCD;border-radius:14px;padding:40px 44px">
      <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:30px;line-height:1.2;color:#1B1A17">${esc(opts.heading)}</h1>
      ${p}${button}${after}
      <p style="margin:24px 0 0;text-align:center;font-family:Georgia,serif;font-size:18px;color:#B08A3E" aria-hidden="true">&#10086;</p>
    </td></tr>
    <tr><td style="padding:20px 8px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6A6358">${opts.footerHtml ?? ""}<br>${name} · Stories, poetry and reflections · <a href="${esc(opts.siteUrl)}" style="color:#6A6358">${esc(opts.siteUrl.replace(/^https?:\/\//, ""))}</a></td></tr>
  </table>
</td></tr></table></body></html>`;
}

export function toPlainText(opts: { heading: string; paragraphs: string[]; button?: EmailButton; after?: string[] }) {
  return [opts.heading, "", ...opts.paragraphs, "", opts.button ? `${opts.button.label}: ${opts.button.url}` : "", ...(opts.after ?? [])]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");
}
