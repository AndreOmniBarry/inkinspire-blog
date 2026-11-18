"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";
import { listRevisions, restoreRevision } from "@/app/studio/actions/posts";
import { toPlainText, type Doc } from "@/lib/editor/render";
import { diffParagraphs } from "@/lib/editor/diff";
import { formatDateTime } from "@/lib/format";

type Rev = Awaited<ReturnType<typeof listRevisions>>[number];

/** Version history: every autosave checkpoint, manual save and publish, with a diff and one-click restore. */
export function RevisionsDrawer({ postId, currentDoc, onClose, onRestored }: { postId: string; currentDoc: Doc; onClose: () => void; onRestored: () => void }) {
  const [revs, setRevs] = useState<Rev[] | null>(null);
  const [selected, setSelected] = useState<Rev | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    listRevisions(postId).then((r) => {
      setRevs(r);
      setSelected(r[0] ?? null);
    });
  }, [postId]);
  const diff = useMemo(() => (selected ? diffParagraphs(toPlainText(selected.contentJson as Doc), toPlainText(currentDoc)) : []), [selected, currentDoc]);
  const reasons: Record<string, string> = { autosave: "Autosaved", manual: "Saved", publish: "Published", restore: "Restored" };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="rev-title">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_35%,transparent)]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-4xl flex-col bg-surface shadow-2xl md:flex-row">
        <div className="flex max-h-[40dvh] flex-col border-b border-rule md:max-h-none md:w-72 md:border-r md:border-b-0">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 id="rev-title" className="font-display text-step-2">Version history</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-sunken md:hidden"><X aria-hidden size={18} /></button>
          </div>
          <ul className="flex-1 overflow-y-auto px-2 pb-4">
            {revs === null && <li className="px-3 text-step-n1 text-ink-muted">Loading…</li>}
            {revs?.length === 0 && <li className="px-3 text-step-n1 text-ink-muted">No earlier versions yet. They appear as you write.</li>}
            {revs?.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setSelected(r)} aria-current={selected?.id === r.id} className={clsx("w-full rounded-[var(--radius-m)] px-3 py-2.5 text-left", selected?.id === r.id ? "bg-ink text-bg" : "hover:bg-sunken")}>
                  <span className="block text-step-n1 font-semibold">{formatDateTime(r.createdAt)}</span>
                  <span className="block text-step-n2 opacity-75">{reasons[r.reason] ?? r.reason} · {r.wordCount.toLocaleString("en-GB")} words{r.author ? ` · ${r.author}` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3">
            <p className="text-step-n1 text-ink-soft">
              <span className="rounded bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] px-1">Removed</span> since this version ·{" "}
              <span className="rounded bg-[color-mix(in_srgb,var(--success)_18%,transparent)] px-1">added</span> since
            </p>
            <div className="flex items-center gap-2">
              {selected && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm("Restore this version? Your current text is saved as a version first, so you can undo this.")) return;
                    setBusy(true);
                    await restoreRevision(selected.id);
                    onRestored();
                  }}
                  className="min-h-10 rounded-full bg-accent px-4 text-step-n1 font-semibold text-on-accent disabled:opacity-60"
                >
                  Restore this version
                </button>
              )}
              <button type="button" onClick={onClose} aria-label="Close" className="hidden size-10 items-center justify-center rounded-full hover:bg-sunken md:inline-flex"><X aria-hidden size={18} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-6">
            {selected && <h3 className="mb-4 font-display text-step-3">{selected.title || "Untitled"}</h3>}
            <div className="prose-ink space-y-4">
              {diff.map((d, i) => (
                <p key={i} className={clsx("rounded px-1", d.kind === "added" && "bg-[color-mix(in_srgb,var(--success)_14%,transparent)]", d.kind === "removed" && "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] line-through decoration-1")} style={{ whiteSpace: "pre-wrap" }}>
                  {d.text}
                </p>
              ))}
              {selected && diff.every((d) => d.kind === "same") && <p className="text-step-n1 text-ink-muted">This version’s text is the same as now.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
