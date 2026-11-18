"use client";

import { useState, useTransition } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";
import { Epigraph, InkParagraph, Ornament, PullQuote, Verse, DropCap } from "@/components/editor/nodes";
import { pageRevisions, restorePageRevision, savePage } from "@/app/studio/actions/pages";
import { formatDateTime } from "@/lib/format";
import type { Doc } from "@/lib/editor/render";

export function PageEditor({ page }: { page: { id: string; slug: string; kind: string; title: string; seoDescription: string | null; contentJson: Doc; isTemplate: boolean } }) {
  const [title, setTitle] = useState(page.title);
  const [seo, setSeo] = useState(page.seoDescription ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [revs, setRevs] = useState<Array<{ id: string; title: string; createdAt: Date }> | null>(null);
  const [pending, start] = useTransition();
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ paragraph: false, heading: { levels: [2, 3, 4] }, codeBlock: false, code: false, horizontalRule: false, link: { openOnClick: false } }), InkParagraph, Verse, Epigraph, PullQuote, Ornament, DropCap, Typography],
    content: page.contentJson,
    editorProps: { attributes: { class: "prose-ink ink-editor outline-none", "aria-label": "Page text", role: "textbox", "aria-multiline": "true" } },
    onUpdate: () => setMsg(null),
  });
  const save = () =>
    start(async () => {
      const r = await savePage({ id: page.id, title, seoDescription: seo || null, contentJson: editor!.getJSON() as Doc });
      setMsg(r.ok ? "Saved and published." : (r.error ?? "Could not save."));
    });
  const href = page.kind === "legal" ? `/legal/${page.slug}` : `/${page.slug}`;
  return (
    <div>
      {page.isTemplate && (
        <p className="mb-5 rounded-[var(--radius-m)] border border-warning/50 bg-surface px-4 py-3 text-step-n1">
          <strong>Template: needs legal review.</strong> This page was drafted as a starting point and is not legal advice. Have your lawyer review it, edit it here, and save; the badge disappears once you save.
        </p>
      )}
      <label htmlFor="pg-title" className="sr-only">Title</label>
      <input id="pg-title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-transparent font-display text-step-4 outline-none" />
      <div className="mt-6 rounded-[var(--radius-l)] border border-rule bg-surface px-4 py-6 md:px-8"><EditorContent editor={editor} /></div>
      <label htmlFor="pg-seo" className="mt-5 mb-1.5 block text-step-n1 font-semibold">Search description</label>
      <textarea id="pg-seo" rows={2} value={seo} onChange={(e) => setSeo(e.target.value)} className="field max-w-2xl" />
      <div className="sticky bottom-0 mt-5 flex flex-wrap items-center gap-3 border-t border-rule bg-bg py-3">
        <button type="button" onClick={save} disabled={pending || !editor} className="min-h-11 rounded-full bg-accent px-6 font-semibold text-on-accent disabled:opacity-60">{pending ? "Saving…" : "Save and publish"}</button>
        <a href={href} target="_blank" rel="noreferrer" className="share-pill">View page</a>
        <button type="button" onClick={() => start(async () => setRevs(await pageRevisions(page.id)))} className="share-pill">Version history</button>
        <span role="status" className="text-step-n1 text-success">{msg}</span>
      </div>
      {revs && (
        <ul className="mt-3 divide-y divide-rule rounded-[var(--radius-l)] border border-rule bg-surface">
          {revs.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-step-n1">
              <span>{formatDateTime(r.createdAt)}</span>
              <button type="button" onClick={() => window.confirm("Restore this version? It becomes the live page.") && start(async () => { await restorePageRevision(r.id); window.location.reload(); })} className="font-semibold text-accent underline">Restore</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
