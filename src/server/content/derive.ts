import "server-only";
import sanitizeHtml from "sanitize-html";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/server/db";
import {
  countWords,
  readingMinutes,
  renderHtml,
  splitAtPaywall,
  toPlainText,
  type Doc,
  type DocNode,
  type MediaResolver,
} from "@/lib/editor/render";
import { mediaSources } from "@/server/media/url";

/** The only tags/attributes that can ever reach a reader. */
export const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "s", "u", "code", "a", "span", "h2", "h3", "h4", "ul", "ol", "li",
    "blockquote", "footer", "hr", "figure", "figcaption", "img", "div",
  ],
  allowedAttributes: {
    a: ["href", "rel"],
    p: ["class"],
    span: ["class", "data-indent"],
    div: ["class", "data-numbered"],
    blockquote: ["class"],
    hr: ["class", "data-style", "aria-hidden"],
    figure: ["class", "data-width"],
    img: ["src", "srcset", "sizes", "alt", "width", "height", "loading", "decoding"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    ol: ["start"],
  },
  allowedClasses: {
    p: ["has-drop-cap"],
    span: ["line", "verse-title", "credit", "small-caps"],
    div: ["ink-verse", "stanza"],
    blockquote: ["ink-epigraph", "ink-pullquote"],
    hr: ["ink-ornament"],
    figure: ["ink-figure"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
};

export function sanitize(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

function collectMediaIds(nodes: DocNode[], acc = new Set<string>()): Set<string> {
  for (const n of nodes) {
    if (n.type === "figure" && typeof n.attrs?.mediaId === "string") acc.add(n.attrs.mediaId);
    if (n.content) collectMediaIds(n.content, acc);
  }
  return acc;
}

export async function mediaResolverFor(doc: Doc): Promise<MediaResolver> {
  const ids = [...collectMediaIds(doc.content ?? [])];
  if (!ids.length) return () => null;
  const rows = await db.select().from(schema.media).where(inArray(schema.media.id, ids));
  const map = new Map(rows.map((r) => [r.id, mediaSources(r)]));
  return (id) => map.get(id) ?? null;
}

export type Derived = {
  previewHtml: string;
  bodyHtml: string;
  searchText: string;
  wordCount: number;
  readingMinutes: number;
  hasPaywall: boolean;
  autoExcerpt: string;
};

/**
 * Everything the public site needs, computed once on save.
 * For premium stories the search text comes from the preview only, so search can never leak
 * the protected part (blueprint 7.6).
 */
export async function deriveContent(doc: Doc, visibility: "free" | "premium"): Promise<Derived> {
  const resolveMedia = await mediaResolverFor(doc);
  const { preview, full, hasPaywall } = splitAtPaywall(doc);
  const premium = visibility === "premium";
  // A premium story with no paywall marker shows only its first two blocks publicly.
  const publicNodes = premium ? (hasPaywall ? preview : full.slice(0, 2)) : full;
  const fullText = toPlainText(full);
  const publicText = toPlainText(publicNodes);
  return {
    previewHtml: sanitize(renderHtml(publicNodes, { resolveMedia })),
    bodyHtml: sanitize(renderHtml(full, { resolveMedia })),
    searchText: premium ? publicText : fullText,
    wordCount: countWords(fullText),
    readingMinutes: readingMinutes(full),
    hasPaywall: premium && hasPaywall,
    autoExcerpt: excerptFrom(publicText),
  };
}

export function excerptFrom(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\s]+$/, "")}…`;
}
