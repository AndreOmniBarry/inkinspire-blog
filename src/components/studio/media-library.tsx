"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMedia, updateMedia } from "@/app/studio/actions/people";
import { MediaPicker } from "@/components/editor/media-picker";

type M = { id: string; src: string; alt: string; caption: string | null; credit: string | null; filename: string; width: number | null; height: number | null; bytes: number; focalX: number; focalY: number; uses: number; createdAt: string };

export function MediaLibrary({ items }: { items: M[] }) {
  const [selected, setSelected] = useState<M | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div>
        <button type="button" onClick={() => setUploading(true)} className="mb-4 min-h-11 rounded-full bg-accent px-5 text-step-n1 font-semibold text-on-accent">Upload an image</button>
        {items.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {items.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => setSelected(m)} aria-pressed={selected?.id === m.id} className="group block w-full overflow-hidden rounded-[var(--radius-m)] border border-rule bg-surface text-left aria-pressed:border-ink aria-pressed:ring-2 aria-pressed:ring-ink">
                  {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail */}
                  <img src={m.src} alt={m.alt} loading="lazy" className="aspect-square w-full object-cover" style={{ objectPosition: `${m.focalX}% ${m.focalY}%` }} />
                  <span className="block truncate px-2 py-1.5 text-step-n2">{m.alt}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[var(--radius-l)] border border-dashed border-rule-strong p-10 text-center text-step-n1 text-ink-soft">No images yet. Upload covers and photos here, or straight from the editor.</p>
        )}
      </div>
      {selected && (
        <aside className="h-fit rounded-[var(--radius-l)] border border-rule bg-surface p-5 lg:sticky lg:top-4" aria-label="Image details">
          <p className="mb-2 text-step-n2 text-ink-muted">Click the image to set the focal point (the part that stays in view when cropped).</p>
          <div
            className="relative cursor-crosshair overflow-hidden rounded"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const fx = Math.round(((e.clientX - r.left) / r.width) * 100);
              const fy = Math.round(((e.clientY - r.top) / r.height) * 100);
              setSelected({ ...selected, focalX: fx, focalY: fy });
              start(async () => { await updateMedia(selected.id, { focalX: fx, focalY: fy }); router.refresh(); });
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- preview */}
            <img src={selected.src} alt={selected.alt} className="w-full" />
            <span aria-hidden className="absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgb(0_0_0/0.5)]" style={{ left: `${selected.focalX}%`, top: `${selected.focalY}%` }} />
          </div>
          <form
            key={selected.id}
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              start(async () => {
                await updateMedia(selected.id, { alt: String(f.get("alt")), caption: String(f.get("caption")), credit: String(f.get("credit")) });
                setMsg("Saved.");
                router.refresh();
              });
            }}
          >
            <div><label htmlFor="m-alt" className="mb-1 block text-step-n1 font-semibold">Alt text (required)</label><textarea id="m-alt" name="alt" required rows={2} defaultValue={selected.alt} className="field" /></div>
            <div><label htmlFor="m-cap" className="mb-1 block text-step-n1 font-semibold">Caption</label><input id="m-cap" name="caption" defaultValue={selected.caption ?? ""} className="field" /></div>
            <div><label htmlFor="m-cr" className="mb-1 block text-step-n1 font-semibold">Credit</label><input id="m-cr" name="credit" defaultValue={selected.credit ?? ""} className="field" /></div>
            <p className="text-step-n2 text-ink-muted">{selected.width}×{selected.height} · {(selected.bytes / 1024).toFixed(0)} KB · used in {selected.uses} place{selected.uses === 1 ? "" : "s"}</p>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={pending} className="min-h-10 rounded-full bg-accent px-5 text-step-n1 font-semibold text-on-accent">Save</button>
              <button type="button" disabled={pending} onClick={() => window.confirm("Delete this image permanently?") && start(async () => { const r = await deleteMedia(selected.id); setMsg(r.error ?? "Deleted."); if (r.ok) { setSelected(null); router.refresh(); } })} className="min-h-10 rounded-full px-4 text-step-n1 font-semibold text-danger">Delete</button>
            </div>
            {msg && <p role="status" className="text-step-n1">{msg}</p>}
          </form>
        </aside>
      )}
      <MediaPicker open={uploading} onClose={() => setUploading(false)} onPick={() => router.refresh()} recent={[]} title="Upload an image" />
    </div>
  );
}
