"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteAuthor, saveAuthor, type PState } from "@/app/studio/actions/people";
import { MediaPicker, type PickedMedia } from "@/components/editor/media-picker";

type A = { id: string; name: string; slug: string; tagline: string | null; bio: string | null; photo: PickedMedia | null; socials: Record<string, string>; storyCount: number; isGuest: boolean };

export function AuthorsUI({ authors, recent }: { authors: A[]; recent: PickedMedia[] }) {
  const [editing, setEditing] = useState<A | "new" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [, start] = useTransition();
  return (
    <div>
      <ul className="grid gap-4 md:grid-cols-2">
        {authors.map((a) => (
          <li key={a.id} className="flex gap-4 rounded-[var(--radius-l)] border border-rule bg-surface p-4">
            <div className="size-16 shrink-0 overflow-hidden rounded-full bg-sunken">
              {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail */}
              {a.photo ? <img src={a.photo.src} alt="" className="h-full w-full object-cover" /> : <span aria-hidden className="flex h-full items-center justify-center font-display text-step-3 text-accent italic">{a.name[0]}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{a.name}</p>
              <p className="text-step-n2 text-ink-muted">{a.tagline ?? "No tagline yet"} · {a.storyCount} stor{a.storyCount === 1 ? "y" : "ies"}</p>
              <div className="mt-2 flex gap-3 text-step-n1">
                <button type="button" onClick={() => setEditing(a)} className="font-semibold text-accent underline">Edit</button>
                <a href={`/authors/${a.slug}`} target="_blank" rel="noreferrer" className="font-semibold text-ink-soft underline">View</a>
                {a.storyCount === 0 && <button type="button" onClick={() => window.confirm(`Remove ${a.name}?`) && start(async () => setMsg((await deleteAuthor(a.id)).error ?? "Removed."))} className="font-semibold text-danger underline">Remove</button>}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {msg && <p role="status" className="mt-3 text-step-n1">{msg}</p>}
      <button type="button" onClick={() => setEditing("new")} className="mt-4 min-h-11 rounded-full border border-rule-strong px-5 text-step-n1 font-semibold">Add an author</button>
      {editing && <AuthorForm author={editing === "new" ? null : editing} recent={recent} onClose={() => setEditing(null)} />}
    </div>
  );
}

function AuthorForm({ author, recent, onClose }: { author: A | null; recent: PickedMedia[]; onClose: () => void }) {
  const [photo, setPhoto] = useState<PickedMedia | null>(author?.photo ?? null);
  const [picking, setPicking] = useState(false);
  const [state, action, pending] = useActionState<PState, FormData>(async (p, f) => {
    const r = await saveAuthor(p, f);
    if (r.ok) onClose();
    return r;
  }, {});
  const s = author?.socials ?? {};
  const field = (name: string, label: string, value?: string | null, type = "text") => (
    <div><label htmlFor={`a-${name}`} className="mb-1.5 block text-step-n1 font-semibold">{label}</label><input id={`a-${name}`} name={name} type={type} defaultValue={value ?? ""} className="field" /></div>
  );
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={author ? `Edit ${author.name}` : "Add an author"}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_40%,transparent)]" onClick={onClose} />
      <form action={action} className="relative max-h-[92dvh] w-full max-w-xl space-y-4 overflow-y-auto rounded-t-[var(--radius-l)] bg-surface p-6 shadow-2xl sm:rounded-[var(--radius-l)]">
        <h2 className="font-display text-step-3">{author ? `Edit ${author.name}` : "Add an author"}</h2>
        {state.error && <p role="alert" className="text-danger">{state.error}</p>}
        <input type="hidden" name="id" value={author?.id ?? ""} />
        <input type="hidden" name="photoMediaId" value={photo?.id ?? ""} />
        <div className="flex items-center gap-4">
          <div className="size-20 overflow-hidden rounded-full bg-sunken">
            {/* eslint-disable-next-line @next/next/no-img-element -- preview of a pre-optimised upload */}
            {photo && <img src={photo.src} alt="" className="h-full w-full object-cover" />}
          </div>
          <button type="button" onClick={() => setPicking(true)} className="share-pill">{photo ? "Change photo" : "Add a photo"}</button>
          {photo && <button type="button" onClick={() => setPhoto(null)} className="text-step-n1 text-ink-soft underline">Remove</button>}
        </div>
        {field("name", "Name", author?.name)}
        {field("slug", "Address (optional)", author?.slug)}
        {field("tagline", "Tagline", author?.tagline)}
        <div><label htmlFor="a-bio" className="mb-1.5 block text-step-n1 font-semibold">Biography</label><textarea id="a-bio" name="bio" rows={5} defaultValue={author?.bio ?? ""} className="field" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("instagram", "Instagram", s.instagram, "url")}
          {field("x", "X", s.x, "url")}
          {field("facebook", "Facebook", s.facebook, "url")}
          {field("linkedin", "LinkedIn", s.linkedin, "url")}
          {field("website", "Website", s.website, "url")}
        </div>
        <div className="flex gap-2"><button type="submit" disabled={pending} className="min-h-11 rounded-full bg-accent px-6 font-semibold text-on-accent">{pending ? "Saving…" : "Save"}</button><button type="button" onClick={onClose} className="min-h-11 px-4 font-semibold text-ink-soft">Cancel</button></div>
        <MediaPicker open={picking} onClose={() => setPicking(false)} onPick={setPhoto} recent={recent} title="Author photo" />
      </form>
    </div>
  );
}
