/**
 * Inkinspire document renderer: TipTap JSON → HTML / plain text / Markdown.
 *
 * Pure and isomorphic (no DOM), used by the server for the public site, emails, RSS and search,
 * and by the Studio for previews. Only known node and mark types are emitted and every string is
 * escaped, so output is safe by construction; the server additionally runs an allowlist sanitiser
 * (defence in depth, see src/server/content/derive.ts).
 *
 * Literary nodes: verse, epigraph, pullQuote, ornament, figure, paywall (+ paragraph.dropCap).
 */

export type Mark = { type: string; attrs?: Record<string, unknown> };
export type DocNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: Mark[];
};
export type Doc = { type: "doc"; content?: DocNode[] };

export type MediaResolver = (mediaId: string) => { src: string; srcSet?: string; width?: number; height?: number } | null;

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Allow http(s), mailto, tel, in-page and site-relative links. Everything else is dropped. */
export function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const h = href.trim();
  if (/^(https?:|mailto:|tel:)/i.test(h)) return h;
  if (/^(\/(?!\/)|#)/.test(h)) return h;
  return null;
}

const isExternal = (href: string) => /^https?:/i.test(href);

function renderMarks(text: string, marks: Mark[] | undefined): string {
  let out = esc(text);
  if (!marks?.length) return out;
  // Stable order: link outermost, then bold, italic, others.
  const order = ["code", "strike", "underline", "smallCaps", "italic", "bold", "link"];
  const sorted = [...marks].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  for (const m of sorted) {
    switch (m.type) {
      case "bold":
        out = `<strong>${out}</strong>`;
        break;
      case "italic":
        out = `<em>${out}</em>`;
        break;
      case "strike":
        out = `<s>${out}</s>`;
        break;
      case "underline":
        out = `<u>${out}</u>`;
        break;
      case "smallCaps":
        out = `<span class="small-caps">${out}</span>`;
        break;
      case "code":
        out = `<code>${out}</code>`;
        break;
      case "link": {
        const href = safeHref(m.attrs?.href);
        if (href) {
          const ext = isExternal(href) ? ' rel="noopener noreferrer"' : "";
          out = `<a href="${esc(href)}"${ext}>${out}</a>`;
        }
        break;
      }
    }
  }
  return out;
}

function inline(nodes: DocNode[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((n) => {
      if (n.type === "text") return renderMarks(n.text ?? "", n.marks);
      if (n.type === "hardBreak") return "<br>";
      return "";
    })
    .join("");
}

/**
 * Verse: the writer types the poem as she would on paper. A new line is a line; an empty line
 * starts a new stanza; leading spaces (2 per level) or tabs indent a line. Marks (italics) survive.
 */
type VerseLine = { indent: number; html: string; text: string };
export function verseStanzas(node: DocNode): VerseLine[][] {
  const lines: Array<{ parts: DocNode[] }> = [{ parts: [] }];
  for (const n of node.content ?? []) {
    if (n.type === "hardBreak") {
      lines.push({ parts: [] });
      continue;
    }
    if (n.type !== "text") continue;
    const pieces = (n.text ?? "").split("\n");
    pieces.forEach((piece, i) => {
      if (i > 0) lines.push({ parts: [] });
      if (piece) lines[lines.length - 1].parts.push({ ...n, text: piece });
    });
  }
  const stanzas: VerseLine[][] = [[]];
  for (const l of lines) {
    const text = l.parts.map((p) => p.text ?? "").join("");
    if (text.trim() === "") {
      if (stanzas[stanzas.length - 1].length) stanzas.push([]);
      continue;
    }
    const lead = /^[\t ]*/.exec(text)?.[0] ?? "";
    const indent = Math.min(4, (lead.match(/\t/g)?.length ?? 0) + Math.floor(lead.replace(/\t/g, "").length / 2));
    // strip the leading whitespace from the first part(s)
    let toStrip = lead.length;
    const parts = l.parts.map((p) => {
      if (toStrip <= 0) return p;
      const t = p.text ?? "";
      const cut = Math.min(toStrip, t.length);
      toStrip -= cut;
      return { ...p, text: t.slice(cut) };
    });
    stanzas[stanzas.length - 1].push({ indent, html: inline(parts), text: text.trim() });
  }
  return stanzas.filter((s) => s.length);
}

type RenderOptions = { resolveMedia?: MediaResolver; editorMode?: boolean };

function block(node: DocNode, opts: RenderOptions): string {
  const a = node.attrs ?? {};
  switch (node.type) {
    case "paragraph": {
      const html = inline(node.content);
      if (!html) return "";
      const cls = a.dropCap ? ' class="has-drop-cap"' : "";
      return `<p${cls}>${html}</p>`;
    }
    case "heading": {
      const level = Math.min(4, Math.max(2, Number(a.level) || 2));
      const html = inline(node.content);
      if (!html) return "";
      const id = slugifyHeading(plainInline(node.content));
      return `<h${level} id="${esc(id)}">${html}</h${level}>`;
    }
    case "blockquote":
      return `<blockquote>${children(node, opts)}</blockquote>`;
    case "bulletList":
      return `<ul>${children(node, opts)}</ul>`;
    case "orderedList": {
      const start = Number(a.start) > 1 ? ` start="${Number(a.start)}"` : "";
      return `<ol${start}>${children(node, opts)}</ol>`;
    }
    case "listItem":
      return `<li>${children(node, opts)}</li>`;
    case "horizontalRule":
      return `<hr class="ink-ornament" data-style="asterism">`;
    case "ornament": {
      const style = ["fleuron", "asterism", "stars"].includes(String(a.style)) ? String(a.style) : "fleuron";
      return `<hr class="ink-ornament" data-style="${style}" aria-hidden="true">`;
    }
    case "epigraph": {
      const attribution = typeof a.attribution === "string" && a.attribution.trim() ? `<footer>${esc(a.attribution.trim())}</footer>` : "";
      return `<blockquote class="ink-epigraph">${children(node, opts)}${attribution}</blockquote>`;
    }
    case "pullQuote":
      return `<blockquote class="ink-pullquote">${children(node, opts)}</blockquote>`;
    case "verse": {
      const stanzas = verseStanzas(node);
      if (!stanzas.length) return "";
      const title = typeof a.title === "string" && a.title.trim() ? `<span class="verse-title">${esc(a.title.trim())}</span>` : "";
      const body = stanzas
        .map(
          (s) =>
            `<div class="stanza">${s.map((l) => `<span class="line"${l.indent ? ` data-indent="${l.indent}"` : ""}>${l.html}</span>`).join("")}</div>`,
        )
        .join("");
      return `<div class="ink-verse" data-numbered="${a.numbered ? "true" : "false"}">${title}${body}</div>`;
    }
    case "figure": {
      const media = typeof a.mediaId === "string" && opts.resolveMedia ? opts.resolveMedia(a.mediaId) : null;
      const src = media?.src ?? (typeof a.src === "string" ? safeHref(a.src) : null);
      if (!src) return "";
      const alt = typeof a.alt === "string" ? a.alt : "";
      const w = media?.width ? ` width="${media.width}"` : "";
      const h = media?.height ? ` height="${media.height}"` : "";
      const srcset = media?.srcSet ? ` srcset="${esc(media.srcSet)}" sizes="(min-width: 64rem) 46rem, 100vw"` : "";
      const caption = typeof a.caption === "string" && a.caption.trim() ? esc(a.caption.trim()) : "";
      const credit = typeof a.credit === "string" && a.credit.trim() ? `<span class="credit">${esc(a.credit.trim())}</span>` : "";
      const width = a.width === "wide" ? ' data-width="wide"' : "";
      return `<figure class="ink-figure"${width}><img src="${esc(src)}" alt="${esc(alt)}"${w}${h}${srcset} loading="lazy" decoding="async">${caption || credit ? `<figcaption>${caption}${credit}</figcaption>` : ""}</figure>`;
    }
    case "paywall":
      return opts.editorMode ? `<div class="ink-paywall">Members only below this line</div>` : "";
    case "audio":
      return ""; // Phase 4: spoken-word embeds. Reserved so documents containing it still render.
    default:
      return "";
  }
}

function children(node: DocNode, opts: RenderOptions) {
  return (node.content ?? []).map((c) => block(c, opts)).join("");
}

export function renderHtml(doc: Doc | DocNode[] | null | undefined, opts: RenderOptions = {}): string {
  const nodes = Array.isArray(doc) ? doc : (doc?.content ?? []);
  return nodes.map((n) => block(n, opts)).join("\n");
}

/* ─────────────── Paywall split ─────────────── */

export function splitAtPaywall(doc: Doc | null | undefined): { preview: DocNode[]; full: DocNode[]; hasPaywall: boolean } {
  const nodes = (doc?.content ?? []).filter(Boolean);
  const i = nodes.findIndex((n) => n.type === "paywall");
  if (i === -1) return { preview: nodes, full: nodes, hasPaywall: false };
  return { preview: nodes.slice(0, i), full: nodes.filter((n) => n.type !== "paywall"), hasPaywall: true };
}

/* ─────────────── Plain text ─────────────── */

function plainInline(nodes: DocNode[] | undefined): string {
  return (nodes ?? []).map((n) => (n.type === "text" ? (n.text ?? "") : n.type === "hardBreak" ? "\n" : "")).join("");
}

export function toPlainText(nodes: DocNode[] | Doc | null | undefined): string {
  const list = Array.isArray(nodes) ? nodes : (nodes?.content ?? []);
  const out: string[] = [];
  const walk = (n: DocNode) => {
    switch (n.type) {
      case "paragraph":
      case "heading":
        out.push(plainInline(n.content));
        break;
      case "verse":
        out.push(verseStanzas(n).map((s) => s.map((l) => l.text).join("\n")).join("\n\n"));
        break;
      case "epigraph":
        (n.content ?? []).forEach(walk);
        if (typeof n.attrs?.attribution === "string") out.push(`— ${n.attrs.attribution}`);
        break;
      case "figure":
        if (typeof n.attrs?.caption === "string") out.push(n.attrs.caption);
        break;
      default:
        (n.content ?? []).forEach(walk);
    }
  };
  list.forEach(walk);
  return out.filter((s) => s.trim()).join("\n\n");
}

export function countWords(text: string): number {
  const m = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return m ? m.length : 0;
}

/** ~230 words per minute for prose; poetry is read more slowly, so verse lines count extra. */
export function readingMinutes(nodes: DocNode[]): number {
  const words = countWords(toPlainText(nodes));
  const verseLines = nodes.filter((n) => n.type === "verse").reduce((acc, v) => acc + verseStanzas(v).flat().length, 0);
  const figures = nodes.filter((n) => n.type === "figure").length;
  const seconds = (words / 230) * 60 + verseLines * 2 + figures * 8;
  return Math.max(1, Math.round(seconds / 60));
}

export function slugifyHeading(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "section"
  );
}

/* ─────────────── Markdown export (portability: the owner is never trapped) ─────────────── */

function mdInline(nodes: DocNode[] | undefined): string {
  return (nodes ?? [])
    .map((n) => {
      if (n.type === "hardBreak") return "  \n";
      if (n.type !== "text") return "";
      let t = (n.text ?? "").replace(/([*_`\\[\]])/g, "\\$1");
      for (const m of n.marks ?? []) {
        if (m.type === "bold") t = `**${t}**`;
        if (m.type === "italic") t = `*${t}*`;
        if (m.type === "strike") t = `~~${t}~~`;
        if (m.type === "link" && safeHref(m.attrs?.href)) t = `[${t}](${safeHref(m.attrs?.href)})`;
      }
      return t;
    })
    .join("");
}

export function toMarkdown(doc: Doc | null | undefined, opts: { resolveMedia?: MediaResolver } = {}): string {
  const out: string[] = [];
  const walk = (n: DocNode, prefix = ""): string => {
    const a = n.attrs ?? {};
    switch (n.type) {
      case "paragraph":
        return prefix + mdInline(n.content);
      case "heading":
        return `${"#".repeat(Math.min(4, Math.max(2, Number(a.level) || 2)))} ${mdInline(n.content)}`;
      case "blockquote":
      case "pullQuote":
        return (n.content ?? []).map((c) => `> ${walk(c)}`).join("\n>\n");
      case "epigraph":
        return [...(n.content ?? []).map((c) => `> *${mdInline(c.content)}*`), a.attribution ? `>\n> — ${a.attribution}` : ""]
          .filter(Boolean)
          .join("\n");
      case "bulletList":
        return (n.content ?? []).map((li) => `- ${(li.content ?? []).map((c) => walk(c)).join("\n  ")}`).join("\n");
      case "orderedList":
        return (n.content ?? []).map((li, i) => `${i + 1}. ${(li.content ?? []).map((c) => walk(c)).join("\n   ")}`).join("\n");
      case "horizontalRule":
      case "ornament":
        return "* * *";
      case "verse":
        return verseStanzas(n)
          .map((s) => s.map((l) => `${"&emsp;".repeat(l.indent)}${l.text}  `).join("\n"))
          .join("\n\n");
      case "figure": {
        const media = typeof a.mediaId === "string" && opts.resolveMedia ? opts.resolveMedia(a.mediaId) : null;
        const src = media?.src ?? a.src;
        return src ? `![${String(a.alt ?? "")}](${String(src)})${a.caption ? `\n*${String(a.caption)}*` : ""}` : "";
      }
      case "paywall":
        return "<!-- members only below this line -->";
      default:
        return "";
    }
  };
  for (const n of doc?.content ?? []) {
    const s = walk(n);
    if (s.trim()) out.push(s);
  }
  return out.join("\n\n") + "\n";
}
