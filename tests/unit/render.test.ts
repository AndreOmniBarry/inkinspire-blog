import { describe, expect, it } from "vitest";
import { renderHtml, splitAtPaywall, toPlainText, verseStanzas, smarten, safeHref, countWords, readingMinutes, toMarkdown, type Doc } from "@/lib/editor/render";
import { markdownToDoc } from "@/lib/editor/markdown-import";
import { highlight } from "@/server/content/search";

const p = (text: string, attrs = {}) => ({ type: "paragraph", attrs, content: [{ type: "text", text }] });

describe("document renderer", () => {
  it("escapes everything: no HTML can be injected through text", () => {
    const html = renderHtml({ type: "doc", content: [p('<script>alert("x")</script>')] });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
  it("drops dangerous links", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("//evil.example")).toBeNull();
    expect(safeHref("https://inkinspire.com")).toBe("https://inkinspire.com");
    const html = renderHtml({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }] });
    expect(html).toBe("<p>x</p>");
  });
  it("typesets verse: lines, stanzas and indents survive", () => {
    const verse = { type: "verse", attrs: {}, content: [{ type: "text", text: "one\n  two\n\nthree" }] };
    const st = verseStanzas(verse);
    expect(st).toHaveLength(2);
    expect(st[0][1]).toMatchObject({ indent: 1, text: "two" });
    const html = renderHtml([verse]);
    expect(html).toContain('<span class="line" data-indent="1">two</span>');
    expect(html.match(/class="stanza"/g)).toHaveLength(2);
  });
  it("splits at the paywall and never renders the marker publicly", () => {
    const doc: Doc = { type: "doc", content: [p("free"), { type: "paywall" }, p("secret")] };
    const s = splitAtPaywall(doc);
    expect(s.hasPaywall).toBe(true);
    expect(toPlainText(s.preview)).toBe("free");
    expect(renderHtml(s.full)).toContain("secret");
    expect(renderHtml(doc)).not.toContain("Members only");
  });
  it("uses proper typographic quotes, dashes and ellipses", () => {
    expect(smarten(`"It's here," she said -- and then... nothing.`)).toBe("“It’s here,” she said – and then… nothing.");
  });
  it("counts words and estimates reading time", () => {
    expect(countWords("Ẹ kú àárọ̀, my friend’s well-being")).toBe(6);
    expect(readingMinutes([p(Array(460).fill("word").join(" "))])).toBe(2);
  });
  it("adds a drop cap class only when asked", () => {
    expect(renderHtml([p("Once", { dropCap: true })])).toBe('<p class="has-drop-cap">Once</p>');
  });
  it("round-trips through Markdown", () => {
    const doc = markdownToDoc("## Title\n\nSome *soft* words.\n\n* * *\n\n```verse\nline one\nline two\n```");
    expect(doc.content?.map((n) => n.type)).toEqual(["heading", "paragraph", "ornament", "verse"]);
    expect(toMarkdown(doc)).toContain("*soft*");
  });
  it("search highlights are escaped before marks are added", () => {
    expect(highlight("<img src=x>\u0001match\u0002")).toBe("&lt;img src=x&gt;<mark>match</mark>");
  });
});
