/**
 * Markdown → Inkinspire document, for "Import Markdown" in the editor. Supports what writers
 * actually use: headings, paragraphs, emphasis, links, quotes, lists, images, section breaks,
 * and fenced ```verse blocks for poems.
 */
import type { Doc, DocNode, Mark } from "./render";

function inline(text: string): DocNode[] {
  const out: DocNode[] = [];
  const re = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ type: "text", text: text.slice(last, m.index) });
    let marks: Mark[] = [];
    let t = "";
    if (m[2] || m[3]) {
      t = m[2] ?? m[3];
      marks = [{ type: "bold" }];
    } else if (m[4] || m[5]) {
      t = m[4] ?? m[5];
      marks = [{ type: "italic" }];
    } else if (m[6]) {
      t = m[6];
      marks = [{ type: "link", attrs: { href: m[7] } }];
    }
    out.push({ type: "text", text: t, marks });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out.filter((n) => n.text);
}

export function markdownToDoc(md: string): Doc {
  const lines = md.replace(/\r/g, "").split("\n");
  const content: DocNode[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) content.push({ type: "paragraph", content: inline(para.join(" ").trim()) });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (/^```\s*(verse|poem)\s*$/i.test(t)) {
      flush();
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) body.push(lines[i++]);
      content.push({ type: "verse", attrs: { numbered: false }, content: body.length ? [{ type: "text", text: body.join("\n") }] : [] });
      continue;
    }
    if (!t) {
      flush();
      continue;
    }
    let m: RegExpExecArray | null;
    if ((m = /^(#{1,4})\s+(.*)$/.exec(t))) {
      flush();
      content.push({ type: "heading", attrs: { level: Math.max(2, Math.min(4, m[1].length + (m[1].length === 1 ? 1 : 0))) }, content: inline(m[2]) });
    } else if (/^(\*\s*\*\s*\*|-{3,}|_{3,}|⁂|❦)$/.test(t)) {
      flush();
      content.push({ type: "ornament", attrs: { style: "fleuron" } });
    } else if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(t))) {
      flush();
      content.push({ type: "figure", attrs: { src: m[2], alt: m[1], caption: "", credit: "" } });
    } else if (t.startsWith(">")) {
      flush();
      const q: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) q.push(lines[i++].trim().replace(/^>\s?/, ""));
      i--;
      content.push({ type: "blockquote", content: q.join("\n").split(/\n\s*\n/).map((p) => ({ type: "paragraph", content: inline(p.replace(/\n/g, " ")) })) });
    } else if (/^([-*+]|\d+[.)])\s+/.test(t)) {
      flush();
      const ordered = /^\d/.test(t);
      const items: DocNode[] = [];
      while (i < lines.length && /^([-*+]|\d+[.)])\s+/.test(lines[i].trim())) {
        items.push({ type: "listItem", content: [{ type: "paragraph", content: inline(lines[i].trim().replace(/^([-*+]|\d+[.)])\s+/, "")) }] });
        i++;
      }
      i--;
      content.push({ type: ordered ? "orderedList" : "bulletList", content: items });
    } else {
      para.push(t);
    }
  }
  flush();
  return { type: "doc", content };
}
