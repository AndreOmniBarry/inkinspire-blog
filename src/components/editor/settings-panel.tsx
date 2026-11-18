"use client";

import type { Editor } from "@tiptap/react";
import { useRef, useState } from "react";
import { Download, FileUp, ImagePlus, X } from "lucide-react";
import { clsx } from "clsx";
import type { PickedMedia } from "./media-picker";
import { markdownToDoc } from "@/lib/editor/markdown-import";
import { slugify } from "@/lib/slug";

export type EditorMeta = {
  title: string;
  subtitle: string | null;
  slug: string;
  excerpt: string | null;
  visibility: "free" | "premium";
  categoryId: string | null;
  collectionId: string | null;
  coverMediaId: string | null;
  authorIds: string[];
  tags: string[];
  featured: boolean;
  commentsEnabled: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type EditorOptions = {
  categories: Array<{ id: string; name: string }>;
  collections: Array<{ id: string; name: string }>;
  authors: Array<{ id: string; name: string }>;
  recentMedia: PickedMedia[];
  canPublish: boolean;
  siteUrl: string;
  siteName: string;
};

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border-b border-rule">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 text-step-n1 font-semibold">
        {title}
        <span aria-hidden className="text-ink-muted transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="space-y-4 px-5 pb-5">{children}</div>
    </details>
  );
}

function Label({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-step-n2 font-semibold tracking-[0.02em]">
      {children}
      {hint && <span className="ml-1 font-normal text-ink-muted">{hint}</span>}
    </label>
  );
}

export function SettingsPanel({
  meta,
  update,
  options,
  cover,
  onCover,
  onRemoveCover,
  editor,
  postId,
  status,
  stats,
}: {
  meta: EditorMeta;
  update: (p: Partial<EditorMeta>) => void;
  options: EditorOptions;
  cover: PickedMedia | null;
  onCover: () => void;
  onRemoveCover: () => void;
  editor: Editor | null;
  postId: string;
  status: string;
  stats: { words: number; minutes: number };
}) {
  const [tagDraft, setTagDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const seoTitle = meta.seoTitle || meta.title || "Untitled story";
  const seoDesc = meta.seoDescription || meta.excerpt || meta.subtitle || "Add an excerpt or a search description so readers know what the story is about.";
  const url = `${options.siteUrl.replace(/^https?:\/\//, "")}/stories/${meta.slug || slugify(meta.title) || "…"}`;

  const addTag = () => {
    const t = tagDraft.trim().replace(/^#/, "");
    if (t && !meta.tags.includes(t.toLowerCase())) update({ tags: [...meta.tags, t.toLowerCase()].slice(0, 12) });
    setTagDraft("");
  };

  return (
    <div className="pb-16 text-step-n1">
      <div className="grid grid-cols-2 gap-px border-b border-rule bg-rule text-center xl:hidden">
        <div className="bg-surface py-3"><p className="font-display text-step-2 tabular-nums">{stats.words.toLocaleString("en-GB")}</p><p className="text-step-n2 text-ink-muted">words</p></div>
        <div className="bg-surface py-3"><p className="font-display text-step-2 tabular-nums">{stats.minutes}</p><p className="text-step-n2 text-ink-muted">min read</p></div>
      </div>

      <Section title="Access">
        <div role="radiogroup" aria-label="Who can read this story" className="grid grid-cols-2 gap-2">
          {(["free", "premium"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={meta.visibility === v}
              onClick={() => update({ visibility: v })}
              className={clsx("min-h-14 rounded-[var(--radius-m)] border p-2 text-left", meta.visibility === v ? "border-ink bg-ink text-bg" : "border-rule hover:border-rule-strong")}
            >
              <span className="block font-semibold">{v === "free" ? "Free" : "Members"}</span>
              <span className="block text-step-n2 opacity-75">{v === "free" ? "Everyone can read it" : "Preview, then members only"}</span>
            </button>
          ))}
        </div>
        {meta.visibility === "premium" && (
          <p className="rounded-[var(--radius-m)] bg-sunken p-3 text-step-n2 text-ink-soft">
            Readers see everything above the <strong>members line</strong>. Type <kbd>/</kbd> and choose “Members line” where the preview should end. Without one, only the first two paragraphs are shown.
          </p>
        )}
      </Section>

      <Section title="Cover image">
        {cover ? (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element -- preview */}
            <img src={cover.src} alt={cover.alt} className="aspect-[3/2] w-full rounded object-cover" />
            <p className="mt-2 text-step-n2 text-ink-muted">Alt text: {cover.alt}</p>
            <div className="mt-2 flex gap-3">
              <button type="button" onClick={onCover} className="font-semibold text-accent underline">Change</button>
              <button type="button" onClick={onRemoveCover} className="font-semibold text-ink-soft underline">Remove</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={onCover} className="flex min-h-24 w-full flex-col items-center justify-center gap-1.5 rounded-[var(--radius-m)] border-2 border-dashed border-rule text-ink-soft hover:border-rule-strong hover:text-ink">
            <ImagePlus aria-hidden size={20} />
            <span className="font-semibold">Add a cover</span>
            <span className="text-step-n2 text-ink-muted">Optional: without one, a typographic cover is made for you</span>
          </button>
        )}
      </Section>

      <Section title="Theme, series and tags">
        <div>
          <Label htmlFor="category">Theme</Label>
          <select id="category" value={meta.categoryId ?? ""} onChange={(e) => update({ categoryId: e.target.value || null })} className="field">
            <option value="">Choose a theme…</option>
            {options.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="collection" hint="(optional)">Series</Label>
          <select id="collection" value={meta.collectionId ?? ""} onChange={(e) => update({ collectionId: e.target.value || null })} className="field">
            <option value="">Not part of a series</option>
            {options.collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="tags" hint="(press Enter after each)">Tags</Label>
          <div className="flex flex-wrap gap-1.5">
            {meta.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-sunken py-1 pr-1 pl-3 text-step-n2">
                {t}
                <button type="button" onClick={() => update({ tags: meta.tags.filter((x) => x !== t) })} aria-label={`Remove tag ${t}`} className="inline-flex size-6 items-center justify-center rounded-full hover:bg-rule">
                  <X aria-hidden size={12} />
                </button>
              </span>
            ))}
          </div>
          <input
            id="tags"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder="e.g. family, grief"
            className="field mt-2"
          />
        </div>
        <div>
          <Label htmlFor="authors">Author</Label>
          <select
            id="authors"
            value={meta.authorIds[0] ?? ""}
            onChange={(e) => update({ authorIds: e.target.value ? [e.target.value, ...meta.authorIds.slice(1).filter((a) => a !== e.target.value)] : [] })}
            className="field"
          >
            {options.authors.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="Excerpt and address">
        <div>
          <Label htmlFor="excerpt" hint="(shown on cards and in search results)">Excerpt</Label>
          <textarea id="excerpt" rows={3} value={meta.excerpt ?? ""} onChange={(e) => update({ excerpt: e.target.value || null })} maxLength={400} className="field" placeholder="One or two sentences that make someone want to read on." />
          <p className="mt-1 text-right text-step-n2 text-ink-muted">{(meta.excerpt ?? "").length}/400</p>
        </div>
        <div>
          <Label htmlFor="slug" hint="(the web address)">Address</Label>
          <div className="flex items-center rounded-[var(--radius-m)] border border-rule-strong bg-surface pl-3 focus-within:border-focus">
            <span className="shrink-0 text-step-n2 text-ink-muted">/stories/</span>
            <input id="slug" value={meta.slug} onChange={(e) => update({ slug: slugify(e.target.value) })} className="min-h-11 w-full bg-transparent px-1 outline-none" />
          </div>
          {status === "published" && <p className="mt-1 text-step-n2 text-warning">Changing the address of a published story breaks links people have shared.</p>}
        </div>
      </Section>

      <Section title="Search and social" defaultOpen={false}>
        <div>
          <Label htmlFor="seoTitle" hint="(optional)">Search title</Label>
          <input id="seoTitle" value={meta.seoTitle ?? ""} onChange={(e) => update({ seoTitle: e.target.value || null })} maxLength={120} className="field" placeholder={meta.title} />
          <p className={clsx("mt-1 text-right text-step-n2", seoTitle.length > 60 ? "text-warning" : "text-ink-muted")}>{seoTitle.length}/60</p>
        </div>
        <div>
          <Label htmlFor="seoDescription" hint="(optional)">Search description</Label>
          <textarea id="seoDescription" rows={3} value={meta.seoDescription ?? ""} onChange={(e) => update({ seoDescription: e.target.value || null })} maxLength={320} className="field" />
          <p className={clsx("mt-1 text-right text-step-n2", (meta.seoDescription ?? "").length > 160 ? "text-warning" : "text-ink-muted")}>{(meta.seoDescription ?? "").length}/160</p>
        </div>
        <div>
          <p className="eyebrow mb-2">On Google</p>
          <div className="rounded-[var(--radius-m)] border border-rule bg-[#fff] p-3 font-[arial,sans-serif] text-[#202124]">
            <p className="truncate text-[12px] text-[#4d5156]">{url}</p>
            <p className="mt-0.5 line-clamp-1 text-[18px] leading-snug text-[#1a0dab]">{seoTitle} · {options.siteName}</p>
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#4d5156]">{seoDesc}</p>
          </div>
        </div>
        <div>
          <p className="eyebrow mb-2">When shared on WhatsApp, X or Facebook</p>
          <div className="overflow-hidden rounded-[var(--radius-m)] border border-rule bg-sunken">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview
              <img src={cover.src} alt="" className="aspect-[1.91/1] w-full object-cover" />
            ) : (
              <div className="flex aspect-[1.91/1] items-center bg-bg p-4">
                <p className="font-display text-step-2 leading-tight">{meta.title || "Untitled story"}</p>
              </div>
            )}
            <div className="p-3">
              <p className="text-step-n2 text-ink-muted uppercase">{options.siteUrl.replace(/^https?:\/\//, "")}</p>
              <p className="line-clamp-1 font-semibold">{seoTitle}</p>
              <p className="line-clamp-2 text-step-n2 text-ink-soft">{seoDesc}</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="More" defaultOpen={false}>
        {options.canPublish && (
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={meta.featured} onChange={(e) => update({ featured: e.target.checked })} className="mt-0.5 size-4 accent-[var(--accent)]" />
            <span><span className="font-semibold">Feature this story</span><span className="block text-step-n2 text-ink-muted">Eligible for the homepage hero and Editor’s picks.</span></span>
          </label>
        )}
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={meta.commentsEnabled} onChange={(e) => update({ commentsEnabled: e.target.checked })} className="mt-0.5 size-4 accent-[var(--accent)]" />
          <span><span className="font-semibold">Allow comments</span><span className="block text-step-n2 text-ink-muted">Comments are moderated before they appear.</span></span>
        </label>
        <div className="flex flex-wrap gap-2 pt-2">
          <a href={`/api/export/story/${postId}?format=md`} className="share-pill"><Download aria-hidden size={14} /> Markdown</a>
          <a href={`/api/export/story/${postId}?format=json`} className="share-pill"><Download aria-hidden size={14} /> JSON</a>
          <button type="button" className="share-pill" onClick={() => fileRef.current?.click()}><FileUp aria-hidden size={14} /> Import Markdown</button>
          <input
            ref={fileRef}
            type="file"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            className="sr-only"
            aria-label="Import a Markdown file"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f || !editor) return;
              const text = await f.text();
              if (editor.getText().trim() && !window.confirm("Replace the current text with the imported file?")) return;
              editor.commands.setContent(markdownToDoc(text));
              e.target.value = "";
            }}
          />
        </div>
      </Section>
    </div>
  );
}
