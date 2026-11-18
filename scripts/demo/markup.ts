/**
 * A tiny markup used only to write demo content legibly; converted to TipTap JSON.
 *
 *   ^Paragraph            first paragraph with a drop cap
 *   ## Heading
 *   epigraph: Text | Attribution
 *   pull: Text            pull quote
 *   ***                   ornamental break (fleuron)
 *   ---paywall---         members-only marker
 *   verse[:numbered][: Title]   … lines …   :end
 *   *italic*  **bold**
 */
import type { Doc, DocNode, Mark } from "../../src/lib/editor/render";

function inline(text: string): DocNode[] {
  const out: DocNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ type: "text", text: text.slice(last, m.index) });
    const token = m[0];
    const bold = token.startsWith("**");
    const inner = bold ? token.slice(2, -2) : token.slice(1, -1);
    const marks: Mark[] = [{ type: bold ? "bold" : "italic" }];
    out.push({ type: "text", text: inner, marks });
    last = m.index! + token.length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out.filter((n) => n.text);
}

export function toDoc(markup: string): Doc {
  const lines = markup.replace(/\r/g, "").split("\n");
  const content: DocNode[] = [];
  let para: string[] = [];
  const flush = () => {
    if (!para.length) return;
    let text = para.join(" ").trim();
    para = [];
    if (!text) return;
    const dropCap = text.startsWith("^");
    if (dropCap) text = text.slice(1);
    content.push({ type: "paragraph", attrs: dropCap ? { dropCap: true } : {}, content: inline(text) });
  };
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (line.startsWith("verse")) {
      flush();
      const head = line.split(":").map((s) => s.trim());
      const numbered = head.includes("numbered");
      const title = head.slice(1).filter((s) => s && s !== "numbered").join(": ") || undefined;
      const body: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ":end") {
        body.push(lines[i].replace(/^ {4}/, ""));
        i++;
      }
      // trim leading/trailing blank lines
      while (body.length && !body[0].trim()) body.shift();
      while (body.length && !body[body.length - 1].trim()) body.pop();
      const nodes: DocNode[] = [];
      body.forEach((l, idx) => {
        if (idx > 0) nodes.push({ type: "text", text: "\n" });
        nodes.push(...(l ? inline(l) : []));
      });
      // merge adjacent plain text nodes for a cleaner document
      const merged: DocNode[] = [];
      for (const n of nodes) {
        const prev = merged[merged.length - 1];
        if (prev && !prev.marks && !n.marks && prev.type === "text" && n.type === "text") prev.text = (prev.text ?? "") + (n.text ?? "");
        else merged.push({ ...n });
      }
      content.push({ type: "verse", attrs: { numbered, title: title ?? null }, content: merged });
      continue;
    }
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("## ")) {
      flush();
      content.push({ type: "heading", attrs: { level: 2 }, content: inline(line.slice(3)) });
    } else if (line.startsWith("epigraph:")) {
      flush();
      const [text, attribution] = line.slice(9).split("|").map((s) => s.trim());
      content.push({ type: "epigraph", attrs: { attribution: attribution ?? null }, content: [{ type: "paragraph", content: inline(text) }] });
    } else if (line.startsWith("pull:")) {
      flush();
      content.push({ type: "pullQuote", content: [{ type: "paragraph", content: inline(line.slice(5).trim()) }] });
    } else if (line === "***") {
      flush();
      content.push({ type: "ornament", attrs: { style: "fleuron" } });
    } else if (line === "---paywall---") {
      flush();
      content.push({ type: "paywall" });
    } else {
      para.push(line);
    }
  }
  flush();
  return { type: "doc", content };
}
