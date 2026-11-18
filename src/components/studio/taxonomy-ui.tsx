"use client";

import { useActionState, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { deleteCategory, deleteCollection, deleteTag, moveCategory, renameTag, saveCategory, saveCollection, type FormState } from "@/app/studio/actions/taxonomy";
import { categoryColours } from "@/styles/tokens";

type Cat = { id: string; name: string; slug: string; description: string | null; colour: string; seoTitle: string | null; seoDescription: string | null; count: number };

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const [editing, setEditing] = useState<Cat | "new" | null>(null);
  const [deleting, setDeleting] = useState<Cat | null>(null);
  const [, start] = useTransition();
  return (
    <div>
      <ul className="divide-y divide-rule overflow-hidden rounded-[var(--radius-l)] border border-rule bg-surface">
        {categories.map((c, i) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span aria-hidden className="size-8 shrink-0 rounded-[var(--radius-s)]" style={{ background: `var(--cat-${c.colour}-bg)`, boxShadow: `inset 0 0 0 1px var(--cat-${c.colour}-ink)` }} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{c.name}</p>
              <p className="text-step-n2 text-ink-muted">/category/{c.slug} · {c.count} stor{c.count === 1 ? "y" : "ies"}</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" disabled={i === 0} onClick={() => start(() => moveCategory(c.id, -1))} aria-label={`Move ${c.name} up`} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-sunken disabled:opacity-30"><ArrowUp aria-hidden size={16} /></button>
              <button type="button" disabled={i === categories.length - 1} onClick={() => start(() => moveCategory(c.id, 1))} aria-label={`Move ${c.name} down`} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-sunken disabled:opacity-30"><ArrowDown aria-hidden size={16} /></button>
              <button type="button" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-sunken"><Pencil aria-hidden size={16} /></button>
              <button type="button" onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`} className="inline-flex size-9 items-center justify-center rounded-full text-danger hover:bg-sunken"><Trash2 aria-hidden size={16} /></button>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setEditing("new")} className="mt-3 min-h-11 rounded-full border border-rule-strong px-5 text-step-n1 font-semibold">Add a theme</button>
      {editing && <CategoryForm cat={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteCategory cat={deleting} others={categories.filter((c) => c.id !== deleting.id)} onClose={() => setDeleting(null)} />}
    </div>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_40%,transparent)]" onClick={onClose} />
      <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[var(--radius-l)] bg-surface p-6 shadow-2xl sm:rounded-[var(--radius-l)]">
        <h2 className="font-display text-step-3">{title}</h2>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function CategoryForm({ cat, onClose }: { cat: Cat | null; onClose: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (p, f) => {
    const r = await saveCategory(p, f);
    if (r.ok) onClose();
    return r;
  }, {});
  const [colour, setColour] = useState(cat?.colour ?? "oxblood");
  return (
    <Dialog title={cat ? `Edit “${cat.name}”` : "Add a theme"} onClose={onClose}>
      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={cat?.id ?? ""} />
        <input type="hidden" name="colour" value={colour} />
        {state.error && <p role="alert" className="text-step-n1 text-danger">{state.error}</p>}
        <div><label htmlFor="c-name" className="mb-1.5 block text-step-n1 font-semibold">Name</label><input id="c-name" name="name" defaultValue={cat?.name} required className="field" /></div>
        <div><label htmlFor="c-slug" className="mb-1.5 block text-step-n1 font-semibold">Address <span className="font-normal text-ink-muted">(leave empty to make one from the name)</span></label><input id="c-slug" name="slug" defaultValue={cat?.slug} className="field" /></div>
        <div><label htmlFor="c-desc" className="mb-1.5 block text-step-n1 font-semibold">Description</label><textarea id="c-desc" name="description" rows={2} defaultValue={cat?.description ?? ""} className="field" /></div>
        <fieldset>
          <legend className="mb-2 text-step-n1 font-semibold">Colour for covers and tiles</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {categoryColours.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={colour === c} aria-label={c} onClick={() => setColour(c)} className="size-10 rounded-full ring-offset-2 ring-offset-surface aria-checked:ring-2 aria-checked:ring-ink" style={{ background: `var(--cat-${c}-bg)`, boxShadow: `inset 0 0 0 2px var(--cat-${c}-ink)` }} />
            ))}
          </div>
        </fieldset>
        <details><summary className="cursor-pointer text-step-n1 font-semibold">Search settings</summary>
          <div className="mt-3 space-y-3">
            <input name="seoTitle" defaultValue={cat?.seoTitle ?? ""} placeholder="Search title" aria-label="Search title" className="field" />
            <textarea name="seoDescription" rows={2} defaultValue={cat?.seoDescription ?? ""} placeholder="Search description" aria-label="Search description" className="field" />
          </div>
        </details>
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={pending} className="min-h-11 rounded-full bg-accent px-6 font-semibold text-on-accent disabled:opacity-60">{pending ? "Saving…" : "Save"}</button>
          <button type="button" onClick={onClose} className="min-h-11 px-4 font-semibold text-ink-soft">Cancel</button>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteCategory({ cat, others, onClose }: { cat: Cat; others: Cat[]; onClose: () => void }) {
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? "");
  const [pending, start] = useTransition();
  return (
    <Dialog title={`Delete “${cat.name}”?`} onClose={onClose}>
      <p className="text-step-n1 text-ink-soft">{cat.count ? `${cat.count} stor${cat.count === 1 ? "y is" : "ies are"} in this theme. Where should ${cat.count === 1 ? "it" : "they"} go?` : "No stories use this theme."}</p>
      {cat.count > 0 && (
        <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="field mt-3" aria-label="Move stories to">
          {others.map((o) => <option key={o.id} value={o.id}>Move to “{o.name}”</option>)}
          <option value="">Leave them without a theme</option>
        </select>
      )}
      <p className="mt-3 text-step-n2 text-ink-muted">Links to /category/{cat.slug} will stop working.</p>
      <div className="mt-5 flex gap-2">
        <button type="button" disabled={pending} onClick={() => start(async () => { await deleteCategory(cat.id, moveTo || null); onClose(); })} className="min-h-11 rounded-full bg-danger px-6 font-semibold text-surface">{pending ? "Deleting…" : "Delete theme"}</button>
        <button type="button" onClick={onClose} className="min-h-11 px-4 font-semibold text-ink-soft">Cancel</button>
      </div>
    </Dialog>
  );
}

export function TagManager({ tags }: { tags: Array<{ id: string; name: string; count: number }> }) {
  const [, start] = useTransition();
  if (!tags.length) return <p className="text-step-n1 text-ink-soft">Tags appear here as you add them to stories.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <li key={t.id} className="inline-flex items-center gap-1 rounded-full border border-rule bg-surface py-1 pr-1 pl-3 text-step-n1">
          #{t.name} <span className="text-step-n2 text-ink-muted">{t.count}</span>
          <button type="button" onClick={() => { const n = window.prompt("Rename tag (an existing name merges them):", t.name); if (n && n !== t.name) start(() => renameTag(t.id, n).then(() => {})); }} aria-label={`Rename tag ${t.name}`} className="inline-flex size-8 items-center justify-center rounded-full hover:bg-sunken"><Pencil aria-hidden size={13} /></button>
          <button type="button" onClick={() => window.confirm(`Delete the tag “${t.name}”? Stories keep everything else.`) && start(() => deleteTag(t.id))} aria-label={`Delete tag ${t.name}`} className="inline-flex size-8 items-center justify-center rounded-full text-danger hover:bg-sunken"><Trash2 aria-hidden size={13} /></button>
        </li>
      ))}
    </ul>
  );
}

export function CollectionManager({ collections }: { collections: Array<{ id: string; name: string; description: string | null; count: number }> }) {
  const [editing, setEditing] = useState<{ id: string; name: string; description: string | null } | "new" | null>(null);
  const [, start] = useTransition();
  const [state, action, pending] = useActionState<FormState, FormData>(async (p, f) => {
    const r = await saveCollection(p, f);
    if (r.ok) setEditing(null);
    return r;
  }, {});
  return (
    <div>
      <ul className="divide-y divide-rule overflow-hidden rounded-[var(--radius-l)] border border-rule bg-surface">
        {collections.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1"><p className="font-semibold">{c.name}</p><p className="text-step-n2 text-ink-muted">{c.count} stor{c.count === 1 ? "y" : "ies"}</p></div>
            <button type="button" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-sunken"><Pencil aria-hidden size={16} /></button>
            <button type="button" onClick={() => window.confirm(`Delete the series “${c.name}”? Its stories are kept.`) && start(() => deleteCollection(c.id))} aria-label={`Delete ${c.name}`} className="inline-flex size-9 items-center justify-center rounded-full text-danger hover:bg-sunken"><Trash2 aria-hidden size={16} /></button>
          </li>
        ))}
        {!collections.length && <li className="px-4 py-3 text-step-n1 text-ink-soft">No series yet. A series groups stories, like “Letters to My Younger Self”.</li>}
      </ul>
      <button type="button" onClick={() => setEditing("new")} className="mt-3 min-h-11 rounded-full border border-rule-strong px-5 text-step-n1 font-semibold">Add a series</button>
      {editing && (
        <Dialog title={editing === "new" ? "Add a series" : `Edit “${editing.name}”`} onClose={() => setEditing(null)}>
          <form action={action} className="space-y-4">
            <input type="hidden" name="id" value={editing === "new" ? "" : editing.id} />
            {state.error && <p role="alert" className="text-step-n1 text-danger">{state.error}</p>}
            <div><label htmlFor="s-name" className="mb-1.5 block text-step-n1 font-semibold">Name</label><input id="s-name" name="name" defaultValue={editing === "new" ? "" : editing.name} required className="field" /></div>
            <div><label htmlFor="s-desc" className="mb-1.5 block text-step-n1 font-semibold">Description</label><textarea id="s-desc" name="description" rows={3} defaultValue={editing === "new" ? "" : (editing.description ?? "")} className="field" /></div>
            <button type="submit" disabled={pending} className="min-h-11 rounded-full bg-accent px-6 font-semibold text-on-accent">{pending ? "Saving…" : "Save"}</button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
