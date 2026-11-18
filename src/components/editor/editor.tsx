"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import { Focus } from "@tiptap/extensions";
import { clsx } from "clsx";
import {
  ArrowLeft, Bold, Check, CloudOff, Eye, Heading2, Heading3, History, Italic, Link2, Loader2, Maximize2, Minimize2,
  PanelRight, Quote, Settings2, TriangleAlert, X,
} from "lucide-react";
import { DropCap, Epigraph, Figure, InkParagraph, Ornament, Paywall, PullQuote, Verse } from "./nodes";
import { SlashMenu, type SlashItem } from "./slash-menu";
import { MediaPicker, type PickedMedia } from "./media-picker";
import { SettingsPanel, type EditorMeta, type EditorOptions } from "./settings-panel";
import { PublishDialog } from "./publish-dialog";
import { RevisionsDrawer } from "./revisions";
import { saveStory } from "@/app/studio/actions/posts";
import type { Doc } from "@/lib/editor/render";
import { formatDateTime } from "@/lib/format";

export type EditorPost = {
  id: string;
  status: "draft" | "pending_review" | "scheduled" | "published" | "archived";
  contentJson: Doc;
  meta: EditorMeta;
  cover: PickedMedia | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  reviewNote: string | null;
};

type SaveState = "saved" | "dirty" | "saving" | "offline" | "error" | "conflict";

const statusLabel: Record<EditorPost["status"], string> = {
  draft: "Draft",
  pending_review: "Pending review",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

/** Clean up what Word and Google Docs put on the clipboard; the schema keeps only meaningful structure. */
function cleanPastedHtml(html: string) {
  return html
    .replace(/<b\b[^>]*id="docs-internal-guid[^"]*"[^>]*>([\s\S]*?)<\/b>/gi, "$1")
    .replace(/<o:p>[\s\S]*?<\/o:p>/gi, "")
    .replace(/<!--\[if[\s\S]*?endif\]-->/gi, "")
    .replace(/\sclass="?Mso[a-zA-Z]+"?/g, "")
    .replace(/<span[^>]*font-weight:\s*(700|bold)[^>]*>([\s\S]*?)<\/span>/gi, "<strong>$2</strong>")
    .replace(/<span[^>]*font-style:\s*italic[^>]*>([\s\S]*?)<\/span>/gi, "<em>$1</em>");
}

export function StoryEditor({ post, options }: { post: EditorPost; options: EditorOptions }) {
  const router = useRouter();
  const [meta, setMeta] = useState<EditorMeta>(post.meta);
  const [cover, setCover] = useState<PickedMedia | null>(post.cover);
  const [status, setStatus] = useState(post.status);
  const [scheduledAt, setScheduledAt] = useState(post.scheduledAt);
  const [save, setSave] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string>(post.updatedAt);
  const [panelOpen, setPanelOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [mediaFor, setMediaFor] = useState<"cover" | "inline" | null>(null);
  const [stats, setStats] = useState({ words: post.meta ? 0 : 0, minutes: 1 });
  const baseUpdatedAt = useRef(post.updatedAt);
  const dirty = useRef(false);
  const metaRef = useRef(meta);
  metaRef.current = { ...meta, coverMediaId: cover?.id ?? null };
  const draftKey = `ink:draft:${post.id}`;

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: [
      StarterKit.configure({
        paragraph: false,
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
        code: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"], HTMLAttributes: { rel: "noopener noreferrer" } },
      }),
      InkParagraph,
      Verse,
      Epigraph,
      PullQuote,
      Ornament,
      Paywall,
      Figure,
      DropCap,
      Typography,
      CharacterCount,
      Focus.configure({ className: "has-focus", mode: "shallowest" }),
      Placeholder.configure({
        placeholder: ({ node, pos }) => (node.type.name === "paragraph" && pos === 0 ? "Begin your story… (type / for verse, epigraphs, images and more)" : node.type.name === "paragraph" ? "Type / to insert a block" : ""),
        includeChildren: false,
      }),
    ],
    content: post.contentJson,
    editorProps: {
      attributes: { class: "prose-ink ink-editor mx-auto outline-none", "aria-label": "Story text", role: "textbox", "aria-multiline": "true" },
      transformPastedHTML: cleanPastedHtml,
    },
    onUpdate: () => markDirty(),
  });

  const markDirty = useCallback(() => {
    dirty.current = true;
    setSave((s) => (s === "conflict" ? s : "dirty"));
  }, []);

  const updateStats = useCallback((ed: Editor | null) => {
    if (!ed) return;
    const words = ed.storage.characterCount?.words?.() ?? 0;
    setStats({ words, minutes: Math.max(1, Math.round(words / 230)) });
  }, []);

  useEffect(() => {
    if (!editor) return;
    updateStats(editor);
    const on = () => updateStats(editor);
    editor.on("update", on);
    return () => {
      editor.off("update", on);
    };
  }, [editor, updateStats]);

  // Recover unsaved work kept on this device (offline tolerance).
  useEffect(() => {
    if (!editor) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const local = JSON.parse(raw) as { at: string; doc: Doc; meta: EditorMeta };
      if (new Date(local.at).getTime() > new Date(post.updatedAt).getTime() + 2000) {
        if (window.confirm("You have unsaved changes from an earlier session on this device. Restore them?")) {
          editor.commands.setContent(local.doc);
          setMeta(local.meta);
          markDirty();
        } else localStorage.removeItem(draftKey);
      } else localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
  }, [editor, draftKey, post.updatedAt, markDirty]);

  const doSave = useCallback(
    async (reason: "autosave" | "manual" = "autosave") => {
      if (!editor) return false;
      const doc = editor.getJSON() as Doc;
      const m = metaRef.current;
      try {
        localStorage.setItem(draftKey, JSON.stringify({ at: new Date().toISOString(), doc, meta: m }));
      } catch {
        /* storage full or private mode */
      }
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSave("offline");
        return false;
      }
      dirty.current = false;
      setSave("saving");
      const res = await saveStory({ postId: post.id, contentJson: doc, meta: m, baseUpdatedAt: baseUpdatedAt.current, reason }).catch(() => ({ ok: false as const, error: "Connection lost." }));
      if (!res.ok) {
        dirty.current = true;
        setSaveError(res.error);
        setSave("conflict" in res && res.conflict ? "conflict" : navigator.onLine ? "error" : "offline");
        return false;
      }
      baseUpdatedAt.current = res.updatedAt;
      setLastSaved(res.updatedAt);
      setSaveError(null);
      if (res.slug !== m.slug) setMeta((x) => ({ ...x, slug: res.slug }));
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
      setSave(dirty.current ? "dirty" : "saved");
      return true;
    },
    [editor, draftKey, post.id],
  );

  // Autosave: 2.5 s after the last change; retry when the connection returns.
  useEffect(() => {
    if (save !== "dirty") return;
    const t = setTimeout(() => void doSave(), 2500);
    return () => clearTimeout(t);
  }, [save, doSave, meta, cover]);
  useEffect(() => {
    const online = () => dirty.current && void doSave();
    window.addEventListener("online", online);
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    const keys = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void doSave("manual");
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFocusMode((f) => !f);
      }
      if (e.key === "Escape") setFocusMode(false);
    };
    window.addEventListener("keydown", keys);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("keydown", keys);
    };
  }, [doSave]);

  const updateMeta = (patch: Partial<EditorMeta>) => {
    setMeta((m) => ({ ...m, ...patch }));
    markDirty();
  };

  const slashItems: SlashItem[] = useMemo(
    () => [
      { id: "verse", label: "Verse", hint: "A poem: line breaks and stanzas kept exactly", keywords: "poem poetry verse stanza", run: (e) => e.chain().focus().insertVerse().run() },
      { id: "h2", label: "Heading", hint: "A section title", keywords: "heading title h2 section", run: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
      { id: "h3", label: "Subheading", hint: "A smaller title", keywords: "subheading h3", run: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
      { id: "epigraph", label: "Epigraph", hint: "An opening quotation with attribution", keywords: "epigraph quote opening", run: (e) => e.chain().focus().insertEpigraph().run() },
      { id: "pull", label: "Pull quote", hint: "A line from the story, set large", keywords: "pull quote highlight", run: (e) => e.chain().focus().insertPullQuote().run() },
      { id: "quote", label: "Quotation", hint: "A block quotation", keywords: "quote blockquote", run: (e) => e.chain().focus().toggleBlockquote().run() },
      { id: "image", label: "Image", hint: "A photo with caption and credit", keywords: "image photo picture figure", run: () => setMediaFor("inline") },
      { id: "ornament", label: "Section break", hint: "A gilt ornament between sections", keywords: "break ornament divider section", run: (e) => e.chain().focus().insertOrnament().run() },
      { id: "list", label: "Bulleted list", hint: "A simple list", keywords: "list bullet", run: (e) => e.chain().focus().toggleBulletList().run() },
      { id: "olist", label: "Numbered list", hint: "A numbered list", keywords: "list numbered ordered", run: (e) => e.chain().focus().toggleOrderedList().run() },
      { id: "dropcap", label: "Drop cap", hint: "A large first letter for this paragraph", keywords: "drop cap initial", run: (e) => e.chain().focus().toggleDropCap().run() },
      { id: "paywall", label: "Members line", hint: "Everything below is for members", keywords: "paywall members premium", run: (e) => { e.chain().focus().insertPaywall().run(); updateMeta({ visibility: "premium" }); } },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- static menu
    [],
  );

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link to (leave empty to remove):", prev ?? "https://");
    if (url === null) return;
    if (!url.trim() || url === "https://") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const saveIndicator = {
    saved: { icon: <Check aria-hidden size={14} />, text: `Saved ${formatDateTime(lastSaved).split(", ").pop()}` },
    dirty: { icon: <span aria-hidden className="size-1.5 rounded-full bg-warning" />, text: "Unsaved changes" },
    saving: { icon: <Loader2 aria-hidden size={14} className="animate-spin" />, text: "Saving…" },
    offline: { icon: <CloudOff aria-hidden size={14} />, text: "Offline: kept on this device" },
    error: { icon: <TriangleAlert aria-hidden size={14} />, text: "Couldn’t save. Retrying…" },
    conflict: { icon: <TriangleAlert aria-hidden size={14} />, text: "Edited elsewhere" },
  }[save];

  // Retry failed saves periodically.
  useEffect(() => {
    if (save !== "error") return;
    const t = setTimeout(() => void doSave(), 8000);
    return () => clearTimeout(t);
  }, [save, doSave]);

  const previewHref = status === "published" ? `/stories/${meta.slug}` : `/studio/preview/${post.id}`;

  return (
    <div className={clsx("studio-editor min-h-dvh", focusMode && "is-focus-mode")}>
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-rule bg-bg/92 backdrop-blur" data-editor-chrome>
        <div className="flex h-14 items-center gap-2 px-3 md:px-5">
          <Link href="/studio/library" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-sunken" aria-label="Back to stories">
            <ArrowLeft aria-hidden size={18} />
          </Link>
          <span className="hidden rounded-full bg-sunken px-2.5 py-1 text-step-n2 font-semibold sm:inline">{statusLabel[status]}</span>
          <span className={clsx("flex items-center gap-1.5 text-step-n2", save === "error" || save === "conflict" ? "text-danger" : "text-ink-muted")} role="status" aria-live="polite" title={saveError ?? undefined}>
            {saveIndicator.icon}
            <span className="hidden xs:inline">{saveIndicator.text}</span>
          </span>
          <span className="ml-auto hidden text-step-n2 text-ink-muted tabular-nums md:inline">
            {stats.words.toLocaleString("en-GB")} words · {stats.minutes} min read
          </span>
          <button type="button" onClick={() => setFocusMode((f) => !f)} className="hidden size-10 items-center justify-center rounded-full hover:bg-sunken md:inline-flex" aria-pressed={focusMode} title="Focus mode (Ctrl/⌘ + Shift + F)" aria-label="Focus mode">
            {focusMode ? <Minimize2 aria-hidden size={17} /> : <Maximize2 aria-hidden size={17} />}
          </button>
          <button type="button" onClick={() => setHistoryOpen(true)} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-sunken" title="Version history" aria-label="Version history">
            <History aria-hidden size={17} />
          </button>
          <a href={previewHref} target="_blank" rel="noreferrer" onClick={() => void doSave("manual")} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-sunken" title="Preview" aria-label="Preview (opens in a new tab)">
            <Eye aria-hidden size={17} />
          </a>
          <button type="button" onClick={() => setPanelOpen((p) => !p)} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-sunken xl:hidden" aria-label="Story settings" aria-expanded={panelOpen}>
            <Settings2 aria-hidden size={17} />
          </button>
          <button
            type="button"
            onClick={async () => {
              await doSave("manual");
              setPublishOpen(true);
            }}
            className="ml-auto inline-flex min-h-10 items-center rounded-full bg-accent px-4 text-step-n1 font-semibold text-on-accent hover:bg-accent-hover md:ml-0"
          >
            {options.canPublish ? (status === "published" ? "Update" : "Publish…") : status === "pending_review" ? "Submitted" : "Submit…"}
          </button>
        </div>
        {save === "conflict" && (
          <div className="flex items-center gap-3 border-t border-rule bg-sunken px-5 py-2 text-step-n1">
            <TriangleAlert aria-hidden size={16} className="text-danger" />
            {saveError}
            <button type="button" onClick={() => router.refresh()} className="font-semibold underline">Reload</button>
          </div>
        )}
        {post.reviewNote && status === "draft" && (
          <div className="border-t border-rule bg-sunken px-5 py-2 text-step-n1">
            <strong>Note from the editor:</strong> {post.reviewNote}
          </div>
        )}
      </div>

      <div className="xl:grid xl:grid-cols-[1fr_22rem]">
        {/* Canvas */}
        <div className="px-4 pt-10 pb-40 md:px-10">
          <div className="mx-auto max-w-[var(--measure)]">
            <AutoTextarea
              value={meta.title}
              onChange={(v) => updateMeta({ title: v })}
              placeholder="Title"
              ariaLabel="Title"
              className="font-display text-step-5 leading-[1.06] tracking-[-0.02em]"
              onEnter={() => editor?.commands.focus("start")}
            />
            <AutoTextarea
              value={meta.subtitle ?? ""}
              onChange={(v) => updateMeta({ subtitle: v || null })}
              placeholder="Add a subtitle (optional)"
              ariaLabel="Subtitle"
              className="mt-3 font-reading text-step-2 text-ink-soft italic"
              onEnter={() => editor?.commands.focus("start")}
            />
            <div className="mt-8 border-t border-rule pt-8" />
          </div>
          <EditorContent editor={editor} />
          {editor && (
            <BubbleMenu editor={editor} className="flex items-center gap-0.5 rounded-full border border-rule bg-ink p-1 text-bg shadow-xl" shouldShow={({ editor: e, state }) => !state.selection.empty && !e.isActive("figure") && !e.isActive("verse")}>
              <ToolButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></ToolButton>
              <ToolButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></ToolButton>
              <ToolButton label="Link" active={editor.isActive("link")} onClick={setLink}><Link2 size={15} /></ToolButton>
              <span className="mx-1 h-5 w-px bg-bg/25" />
              <ToolButton label="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></ToolButton>
              <ToolButton label="Subheading" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></ToolButton>
              <ToolButton label="Quotation" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></ToolButton>
              <ToolButton label="Drop cap" active={!!editor.getAttributes("paragraph").dropCap} onClick={() => editor.chain().focus().toggleDropCap().run()}>
                <span className="font-display text-[15px] leading-none">A</span>
              </ToolButton>
            </BubbleMenu>
          )}
          <SlashMenu editor={editor} items={slashItems} />
        </div>

        {/* Settings panel: column on wide screens, drawer elsewhere */}
        <aside
          className={clsx(
            "border-l border-rule bg-surface",
            "xl:sticky xl:top-14 xl:block xl:h-[calc(100dvh-3.5rem)] xl:overflow-y-auto",
            panelOpen ? "fixed inset-y-0 right-0 z-40 block w-[min(24rem,100vw)] overflow-y-auto shadow-2xl" : "hidden",
          )}
          aria-label="Story settings"
          data-editor-chrome
        >
          <div className="flex items-center justify-between border-b border-rule px-5 py-3 xl:hidden">
            <span className="font-semibold">Story settings</span>
            <button type="button" onClick={() => setPanelOpen(false)} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-sunken" aria-label="Close settings">
              <X aria-hidden size={18} />
            </button>
          </div>
          <SettingsPanel
            meta={meta}
            update={updateMeta}
            options={options}
            cover={cover}
            onCover={() => setMediaFor("cover")}
            onRemoveCover={() => { setCover(null); markDirty(); }}
            editor={editor}
            postId={post.id}
            status={status}
            stats={stats}
          />
        </aside>
        {panelOpen && <button type="button" aria-label="Close settings" className="fixed inset-0 z-30 bg-[color-mix(in_srgb,var(--ink)_25%,transparent)] xl:hidden" onClick={() => setPanelOpen(false)} />}
      </div>

      {focusMode && (
        <button type="button" onClick={() => setFocusMode(false)} className="fixed right-4 bottom-4 z-40 inline-flex min-h-10 items-center gap-2 rounded-full border border-rule bg-surface px-4 text-step-n1 font-semibold shadow">
          <PanelRight aria-hidden size={15} /> Leave focus mode
        </button>
      )}

      <MediaPicker
        open={mediaFor !== null}
        onClose={() => setMediaFor(null)}
        recent={options.recentMedia}
        title={mediaFor === "cover" ? "Choose a cover image" : "Add an image"}
        onPick={(m) => {
          if (mediaFor === "cover") {
            setCover(m);
            markDirty();
          } else editor?.chain().focus().insertFigure({ mediaId: m.id, src: m.src, alt: m.alt }).run();
        }}
      />
      {publishOpen && editor && (
        <PublishDialog
          postId={post.id}
          editor={editor}
          meta={meta}
          cover={cover}
          status={status}
          scheduledAt={scheduledAt}
          canPublish={options.canPublish}
          onClose={() => setPublishOpen(false)}
          onDone={(s, at) => {
            setStatus(s as EditorPost["status"]);
            setScheduledAt(at);
            setPublishOpen(false);
            router.refresh();
          }}
          save={() => doSave("manual")}
        />
      )}
      {historyOpen && (
        <RevisionsDrawer
          postId={post.id}
          currentDoc={(editor?.getJSON() as Doc) ?? post.contentJson}
          onClose={() => setHistoryOpen(false)}
          onRestored={() => {
            dirty.current = false;
            try {
              localStorage.removeItem(draftKey);
            } catch {
              /* ignore */
            }
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function ToolButton({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} aria-label={label} aria-pressed={active} title={label} className={clsx("inline-flex size-9 items-center justify-center rounded-full", active ? "bg-bg text-ink" : "hover:bg-bg/15")}>
      {children}
    </button>
  );
}

function AutoTextarea({ value, onChange, placeholder, className, ariaLabel, onEnter }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string; ariaLabel: string; onEnter?: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter?.();
        }
      }}
      className={clsx("block w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-ink-muted/70", className)}
    />
  );
}
