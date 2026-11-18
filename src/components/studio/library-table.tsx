"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { Star } from "lucide-react";
import { bulkWorkflow, setFlags } from "@/app/studio/actions/posts";
import { formatDateTime } from "@/lib/format";

type Row = {
  id: string;
  title: string;
  slug: string;
  status: string;
  visibility: "free" | "premium";
  featured: boolean;
  wordCount: number;
  updatedAt: Date;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  isDemo: boolean;
  category: string | null;
  author: string | null;
};

const statusStyle: Record<string, string> = {
  draft: "bg-sunken text-ink-soft",
  pending_review: "bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-warning",
  scheduled: "bg-[color-mix(in_srgb,var(--gilt)_20%,transparent)] text-gilt-ink",
  published: "bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-success",
  archived: "bg-sunken text-ink-muted",
};
const statusName: Record<string, string> = { draft: "Draft", pending_review: "Pending review", scheduled: "Scheduled", published: "Published", archived: "Archived" };

export function LibraryTable({ rows, canPublish, canDelete }: { rows: Row[]; canPublish: boolean; canDelete: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const ids = [...selected];
  const run = (fn: () => Promise<unknown>, done: string) =>
    start(async () => {
      await fn();
      setSelected(new Set());
      setMessage(done);
      router.refresh();
    });

  return (
    <div>
      {selected.size > 0 && (
        <div className="sticky top-14 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-m)] border border-rule bg-surface p-2 shadow lg:top-2" role="toolbar" aria-label="Bulk actions">
          <span className="px-2 text-step-n1 font-semibold">{selected.size} selected</span>
          {canPublish && (
            <>
              <button type="button" disabled={pending} onClick={() => run(() => setFlags(ids, { featured: true }), "Featured.")} className="share-pill">Feature</button>
              <button type="button" disabled={pending} onClick={() => run(() => setFlags(ids, { featured: false }), "Unfeatured.")} className="share-pill">Unfeature</button>
              <button type="button" disabled={pending} onClick={() => run(() => setFlags(ids, { visibility: "free" }), "Now free to read.")} className="share-pill">Make free</button>
              <button type="button" disabled={pending} onClick={() => run(() => setFlags(ids, { visibility: "premium" }), "Now for members.")} className="share-pill">Make members-only</button>
              <button type="button" disabled={pending} onClick={() => run(() => bulkWorkflow(ids, "archive"), "Archived.")} className="share-pill">Archive</button>
            </>
          )}
          {canDelete && (
            <button
              type="button"
              disabled={pending}
              onClick={() => window.confirm(`Delete ${selected.size} stor${selected.size === 1 ? "y" : "ies"} permanently? This can’t be undone.`) && run(() => bulkWorkflow(ids, "delete"), "Deleted.")}
              className="share-pill border-danger/50 text-danger"
            >
              Delete
            </button>
          )}
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto px-3 text-step-n1 font-semibold text-ink-soft">Clear</button>
        </div>
      )}
      {message && <p role="status" className="mb-3 text-step-n1 text-success">{message}</p>}
      <div className="overflow-hidden rounded-[var(--radius-l)] border border-rule bg-surface">
        <table className="w-full text-left text-step-n1">
          <caption className="sr-only">Stories</caption>
          <thead className="hidden border-b border-rule bg-sunken text-step-n2 text-ink-soft md:table-header-group">
            <tr>
              <th className="w-10 p-3"><span className="sr-only">Select</span></th>
              <th className="p-3 font-semibold">Story</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold">Access</th>
              <th className="p-3 font-semibold">Updated</th>
              {canPublish && <th className="p-3 font-semibold"><span className="sr-only">Featured</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map((r) => (
              <tr key={r.id} className={clsx("grid grid-cols-[2.5rem_1fr] md:table-row", selected.has(r.id) && "bg-sunken")}>
                <td className="row-span-3 p-3 align-top md:align-middle">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select “${r.title || "Untitled"}”`} className="size-4 accent-[var(--accent)]" />
                </td>
                <td className="px-3 pt-3 md:py-3">
                  <Link href={`/studio/write/${r.id}`} className="font-semibold hover:text-accent">{r.title || <span className="text-ink-muted italic">Untitled</span>}</Link>
                  <p className="mt-0.5 text-step-n2 text-ink-muted">
                    {[r.category, r.author, `${r.wordCount.toLocaleString("en-GB")} words`].filter(Boolean).join(" · ")}
                    {r.isDemo && <span className="ml-2 rounded bg-sunken px-1.5 py-0.5 text-[0.7rem] font-semibold tracking-wide uppercase">Demo</span>}
                  </p>
                </td>
                <td className="px-3 pt-1 md:py-3">
                  <span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-step-n2 font-semibold", statusStyle[r.status])}>{statusName[r.status]}</span>
                  {r.status === "scheduled" && r.scheduledAt && <span className="ml-2 text-step-n2 text-ink-muted md:ml-0 md:mt-1 md:block">{formatDateTime(r.scheduledAt)}</span>}
                </td>
                <td className="hidden px-3 md:table-cell md:py-3">{r.visibility === "premium" ? <span className="font-semibold text-gilt-ink">Members</span> : <span className="text-ink-soft">Free</span>}</td>
                <td className="px-3 pb-3 text-step-n2 text-ink-muted md:py-3">{formatDateTime(r.updatedAt)}</td>
                {canPublish && (
                  <td className="hidden px-3 md:table-cell md:py-3">
                    <button
                      type="button"
                      onClick={() => run(() => setFlags([r.id], { featured: !r.featured }), r.featured ? "Unfeatured." : "Featured.")}
                      aria-pressed={r.featured}
                      aria-label={r.featured ? `Unfeature “${r.title}”` : `Feature “${r.title}”`}
                      className="inline-flex size-9 items-center justify-center rounded-full hover:bg-sunken"
                    >
                      <Star aria-hidden size={16} className={r.featured ? "fill-gilt text-gilt" : "text-ink-muted"} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
