"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { clsx } from "clsx";
import { checkLinks, runWorkflow } from "@/app/studio/actions/posts";
import type { EditorMeta } from "./settings-panel";
import type { PickedMedia } from "./media-picker";
import { formatDateTime } from "@/lib/format";

type Check = { id: string; ok: boolean; text: string; pending?: boolean };

/** Lagos is UTC+1 all year (no daylight saving), so a local date-time maps exactly. */
const toLagosInput = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 60 * 60_000);
  return d.toISOString().slice(0, 16);
};
const fromLagosInput = (v: string) => new Date(`${v}:00+01:00`).toISOString();

/**
 * The pre-publish checklist (warns, never blocks) and the publishing choices:
 * publish now, schedule to the minute, submit for review, or take it down.
 */
export function PublishDialog({
  postId,
  editor,
  meta,
  cover,
  status,
  scheduledAt,
  canPublish,
  onClose,
  onDone,
  save,
}: {
  postId: string;
  editor: Editor;
  meta: EditorMeta;
  cover: PickedMedia | null;
  status: string;
  scheduledAt: string | null;
  canPublish: boolean;
  onClose: () => void;
  onDone: (status: string, scheduledAt: string | null) => void;
  save: () => Promise<boolean>;
}) {
  const [mode, setMode] = useState<"now" | "schedule">(scheduledAt ? "schedule" : "now");
  const [when, setWhen] = useState(() => toLagosInput(scheduledAt ?? new Date(Date.now() + 24 * 3600_000).toISOString()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkResult, setLinkResult] = useState<{ broken: string[]; done: boolean }>({ broken: [], done: false });
  const [note, setNote] = useState("");

  const doc = editor.getJSON();
  const links = useMemo(() => {
    const out: string[] = [];
    const walk = (n: { marks?: Array<{ type: string; attrs?: { href?: string } }>; content?: unknown[] }) => {
      n.marks?.forEach((m) => m.type === "link" && m.attrs?.href && out.push(m.attrs.href));
      (n.content as typeof n[] | undefined)?.forEach(walk);
    };
    walk(doc as never);
    return [...new Set(out)];
  }, [doc]);

  useEffect(() => {
    if (!links.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- nothing to check
      setLinkResult({ broken: [], done: true });
      return;
    }
    checkLinks(links)
      .then((r) => setLinkResult({ broken: r.filter((x) => !x.ok).map((x) => x.url), done: true }))
      .catch(() => setLinkResult({ broken: [], done: true }));
  }, [links]);

  const figures: Array<{ alt?: string }> = [];
  let hasPaywall = false;
  (doc.content ?? []).forEach((n) => {
    if (n.type === "figure") figures.push(n.attrs ?? {});
    if (n.type === "paywall") hasPaywall = true;
  });

  const checks: Check[] = [
    { id: "title", ok: !!meta.title.trim() && meta.title.length <= 90, text: !meta.title.trim() ? "Add a title" : meta.title.length > 90 ? `The title is long (${meta.title.length} characters); under 90 reads best` : "Title looks good" },
    { id: "category", ok: !!meta.categoryId, text: meta.categoryId ? "Theme chosen" : "Choose a theme so readers can find it" },
    { id: "excerpt", ok: !!meta.excerpt?.trim(), text: meta.excerpt?.trim() ? "Excerpt written" : "No excerpt: one will be taken from the opening lines" },
    { id: "cover", ok: !!cover, text: cover ? "Cover image added" : "No cover image: a typographic cover will be used" },
    { id: "alt", ok: figures.every((f) => f.alt?.trim()) && (!cover || !!cover.alt), text: figures.every((f) => f.alt?.trim()) ? "Every image has alt text" : `${figures.filter((f) => !f.alt?.trim()).length} image(s) need alt text` },
    ...(meta.visibility === "premium" ? [{ id: "paywall", ok: hasPaywall, text: hasPaywall ? "Members line placed" : "Members story without a members line: only the first two paragraphs will be public" }] : []),
    { id: "links", ok: linkResult.broken.length === 0, pending: !linkResult.done, text: !linkResult.done ? "Checking links…" : linkResult.broken.length ? `${linkResult.broken.length} link(s) didn’t respond: ${linkResult.broken.slice(0, 2).join(", ")}` : links.length ? "All links work" : "No links to check" },
  ];

  const act = async (action: "publish" | "schedule" | "submit" | "unpublish" | "archive" | "request_changes") => {
    setBusy(true);
    setError(null);
    await save();
    const res = await runWorkflow({ postId, action, scheduledAt: action === "schedule" ? fromLagosInput(when) : null, note: action === "request_changes" ? note : null });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onDone(res.status, action === "schedule" ? fromLagosInput(when) : null);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="publish-title">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_40%,transparent)]" onClick={onClose} />
      <div className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[var(--radius-l)] bg-surface p-6 shadow-2xl sm:rounded-[var(--radius-l)] md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="publish-title" className="font-display text-step-3">{canPublish ? (status === "published" ? "Published" : "Ready to publish?") : "Submit for review"}</h2>
            <p className="mt-1 text-step-n1 text-ink-soft">“{meta.title || "Untitled"}”</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-sunken"><X aria-hidden size={18} /></button>
        </div>

        <ul className="mt-6 space-y-2.5" aria-label="Before you publish">
          {checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2.5 text-step-n1">
              {c.pending ? <Loader2 aria-hidden size={17} className="mt-0.5 shrink-0 animate-spin text-ink-muted" /> : c.ok ? <CheckCircle2 aria-hidden size={17} className="mt-0.5 shrink-0 text-success" /> : <AlertTriangle aria-hidden size={17} className="mt-0.5 shrink-0 text-warning" />}
              <span className={clsx(!c.ok && !c.pending && "text-ink")}>{c.text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-step-n2 text-ink-muted">These are suggestions. You can publish anyway.</p>

        {error && <p role="alert" className="mt-5 rounded-[var(--radius-m)] border border-danger/40 px-4 py-3 text-step-n1 text-danger">{error}</p>}

        {canPublish ? (
          <>
            {status !== "published" && (
              <fieldset className="mt-6">
                <legend className="mb-2 text-step-n1 font-semibold">When?</legend>
                <div className="grid grid-cols-2 gap-2" role="radiogroup">
                  {(["now", "schedule"] as const).map((m) => (
                    <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={clsx("min-h-11 rounded-[var(--radius-m)] border font-semibold", mode === m ? "border-ink bg-ink text-bg" : "border-rule")}>
                      {m === "now" ? "Publish now" : "Schedule"}
                    </button>
                  ))}
                </div>
                {mode === "schedule" && (
                  <div className="mt-3">
                    <label htmlFor="when" className="mb-1.5 block text-step-n2 font-semibold">Date and time (Lagos time, WAT)</label>
                    <input id="when" type="datetime-local" value={when} min={toLagosInput(new Date().toISOString())} onChange={(e) => setWhen(e.target.value)} className="field" />
                    <p className="mt-1.5 text-step-n2 text-ink-muted">It will appear on the site at exactly this minute, even if no one is signed in.</p>
                  </div>
                )}
              </fieldset>
            )}
            {status === "scheduled" && scheduledAt && <p className="mt-4 text-step-n1 text-ink-soft">Currently scheduled for {formatDateTime(scheduledAt)} (Lagos time).</p>}
            <div className="mt-6 flex flex-col gap-2">
              {status === "published" ? (
                <button type="button" disabled={busy} onClick={onClose} className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent font-semibold text-on-accent">Done: your changes are live</button>
              ) : (
                <button type="button" disabled={busy} onClick={() => act(mode === "now" ? "publish" : "schedule")} className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60">
                  {busy ? "Working…" : mode === "now" ? "Publish now" : "Schedule"}
                </button>
              )}
              {status === "pending_review" && (
                <div className="mt-2 rounded-[var(--radius-m)] border border-rule p-3">
                  <label htmlFor="note" className="mb-1.5 block text-step-n2 font-semibold">Send back to the author with a note</label>
                  <textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="field" placeholder="What should change?" />
                  <button type="button" disabled={busy} onClick={() => act("request_changes")} className="mt-2 min-h-10 rounded-full border border-rule-strong px-4 text-step-n1 font-semibold">Request changes</button>
                </div>
              )}
              {(status === "published" || status === "scheduled") && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => act("unpublish")} className="min-h-10 rounded-full border border-rule-strong px-4 text-step-n1 font-semibold">Unpublish (back to draft)</button>
                  <button type="button" disabled={busy} onClick={() => act("archive")} className="min-h-10 rounded-full px-4 text-step-n1 font-semibold text-ink-soft hover:text-ink">Archive</button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-6">
            {status === "pending_review" ? (
              <p className="text-step-n1 text-ink-soft">This story is with the editor. You’ll be able to edit it again if they send it back.</p>
            ) : (
              <button type="button" disabled={busy} onClick={() => act("submit")} className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent font-semibold text-on-accent disabled:opacity-60">
                {busy ? "Submitting…" : "Submit for review"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
