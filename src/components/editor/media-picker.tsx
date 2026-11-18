"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { clsx } from "clsx";

export type PickedMedia = { id: string; src: string; alt: string; width?: number; height?: number };

/** Upload a new image (alt text required) or choose a recent one. Used for covers and inline images. */
export function MediaPicker({ open, onClose, onPick, recent, title = "Add an image" }: { open: boolean; onClose: () => void; onPick: (m: PickedMedia) => void; recent: PickedMedia[]; title?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [credit, setCredit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  if (!open) return null;

  const choose = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  };
  const upload = async () => {
    if (!file) return;
    if (!alt.trim()) return setError("Please describe the image first. One sentence is enough.");
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("alt", alt.trim());
    if (credit.trim()) fd.set("credit", credit.trim());
    const res = await fetch("/api/media/upload", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({ error: "Upload failed." }));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Upload failed.");
    onPick({ id: json.media.id, src: json.media.src, alt: json.media.alt, width: json.media.width, height: json.media.height });
    setFile(null);
    setPreview(null);
    setAlt("");
    setCredit("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="media-title">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_40%,transparent)]" onClick={onClose} />
      <div className="relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-[var(--radius-l)] bg-surface p-5 shadow-2xl sm:rounded-[var(--radius-l)] md:p-7">
        <div className="flex items-center justify-between">
          <h2 id="media-title" className="font-display text-step-2">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-sunken">
            <X aria-hidden size={18} />
          </button>
        </div>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            choose(e.dataTransfer.files[0]);
          }}
          className={clsx("mt-5 grid gap-4 rounded-[var(--radius-m)] border-2 border-dashed border-rule p-4", preview ? "sm:grid-cols-[12rem_1fr]" : "")}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview
            <img src={preview} alt="" className="aspect-square w-full rounded object-cover" />
          ) : (
            <button type="button" onClick={() => input.current?.click()} className="flex min-h-36 flex-col items-center justify-center gap-2 text-ink-soft hover:text-ink">
              <ImagePlus aria-hidden size={28} strokeWidth={1.5} />
              <span className="text-step-n1 font-semibold">Choose a photo, or drop it here</span>
              <span className="text-step-n2 text-ink-muted">JPEG, PNG, WebP, GIF, AVIF or HEIC, up to 15 MB</span>
            </button>
          )}
          <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} aria-label="Choose an image file" />
          {preview && (
            <div className="space-y-3">
              <label className="block text-step-n1 font-semibold" htmlFor="mp-alt">
                Describe the image <span className="font-normal text-ink-muted">(required)</span>
              </label>
              <textarea id="mp-alt" value={alt} onChange={(e) => setAlt(e.target.value)} rows={2} className="field" placeholder="e.g. A woman reading by a window in soft morning light" />
              <label className="block text-step-n1 font-semibold" htmlFor="mp-credit">
                Credit <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input id="mp-credit" value={credit} onChange={(e) => setCredit(e.target.value)} className="field" placeholder="Photo: Ada Obi" />
              {error && <p role="alert" className="text-step-n1 text-danger">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={upload} disabled={busy} className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-step-n1 font-semibold text-on-accent disabled:opacity-60">
                  {busy ? "Uploading and optimising…" : "Upload"}
                </button>
                <button type="button" onClick={() => { setFile(null); setPreview(null); }} className="min-h-11 px-3 text-step-n1 font-semibold text-ink-soft">
                  Choose another
                </button>
              </div>
            </div>
          )}
        </div>
        {recent.length > 0 && (
          <>
            <p className="eyebrow mt-6 mb-3">Or choose a recent image</p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {recent.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => { onPick(m); onClose(); }} className="block aspect-square w-full overflow-hidden rounded border border-rule hover:border-ink focus-visible:border-ink">
                    {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail */}
                    <img src={m.src} alt={m.alt} className="h-full w-full object-cover" loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
