"use client";

import { useState, useTransition } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, RotateCw, X } from "lucide-react";
import { clsx } from "clsx";
import { saveHomepage } from "@/app/studio/actions/homepage";

type Slot = { id: string; section: string; enabled: boolean; heading: string | null; postIds: string[] };
type Story = { id: string; title: string; featured: boolean };

const names: Record<string, { title: string; help: string; picks?: number }> = {
  hero: { title: "Featured story (hero)", help: "The large story at the top. Pick one, or the newest featured story is used.", picks: 1 },
  editors_picks: { title: "Editor’s picks", help: "Three hand-chosen stories. Empty places are filled with featured stories.", picks: 3 },
  latest: { title: "Latest stories", help: "The six newest stories, automatically." },
  popular: { title: "Most read", help: "Ranked by readers who finish, from your own reading data." },
  categories: { title: "Read by theme", help: "Tiles for every theme." },
  author: { title: "The storyteller", help: "Your author introduction." },
  membership: { title: "Membership invitation", help: "Invites readers to become members." },
  newsletter: { title: "Newsletter", help: "The sign-up form." },
  collections: { title: "Series", help: "Your series." },
};

export function HomepageEditor({ initial, stories }: { initial: Slot[]; stories: Story[] }) {
  const [slots, setSlots] = useState(initial);
  const [saved, setSaved] = useState(true);
  const [pending, start] = useTransition();
  const [previewKey, setPreviewKey] = useState(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const update = (id: string, patch: Partial<Slot>) => {
    setSlots((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setSaved(false);
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    setSlots((s) => arrayMove(s, s.findIndex((x) => x.id === e.active.id), s.findIndex((x) => x.id === e.over!.id)));
    setSaved(false);
  };
  const save = () =>
    start(async () => {
      await saveHomepage(slots.map(({ id, enabled, heading, postIds }) => ({ id, enabled, heading, postIds })));
      setSaved(true);
      setPreviewKey((k) => k + 1);
    });

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,34rem)_1fr]">
      <div>
        <p className="mb-3 text-step-n1 text-ink-soft">Drag sections to reorder them (or focus the handle and use the arrow keys). Changes go live when you save.</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={slots.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {slots.map((s) => (
                <SortableSlot key={s.id} slot={s} stories={stories} update={update} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        <div className="sticky bottom-0 mt-4 flex items-center gap-3 border-t border-rule bg-bg py-3">
          <button type="button" onClick={save} disabled={pending || saved} className="min-h-11 rounded-full bg-accent px-6 font-semibold text-on-accent disabled:opacity-50">{pending ? "Saving…" : saved ? "Saved" : "Save homepage"}</button>
          {!saved && <span className="text-step-n1 text-ink-soft">Unsaved changes</span>}
        </div>
      </div>
      <div className="hidden 2xl:block">
        <div className="sticky top-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="eyebrow">Live preview</p>
            <button type="button" onClick={() => setPreviewKey((k) => k + 1)} className="inline-flex items-center gap-1.5 text-step-n2 font-semibold text-ink-soft hover:text-ink"><RotateCw aria-hidden size={13} /> Refresh</button>
          </div>
          <div className="h-[80dvh] overflow-hidden rounded-[var(--radius-l)] border border-rule">
            <iframe key={previewKey} src="/" title="Homepage preview" className="h-[133%] w-[133%] origin-top-left scale-75" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableSlot({ slot, stories, update }: { slot: Slot; stories: Story[]; update: (id: string, p: Partial<Slot>) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.id });
  const info = names[slot.section] ?? { title: slot.section, help: "" };
  const featuredFirst = [...stories].sort((a, b) => Number(b.featured) - Number(a.featured));
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={clsx("rounded-[var(--radius-l)] border border-rule bg-surface", isDragging && "relative z-10 shadow-xl", !slot.enabled && "opacity-60")}>
      <div className="flex items-start gap-2 p-3">
        <button type="button" {...attributes} {...listeners} aria-label={`Reorder ${info.title}`} className="mt-0.5 inline-flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded hover:bg-sunken active:cursor-grabbing"><GripVertical aria-hidden size={18} /></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">{info.title}</p>
            <label className="flex items-center gap-2 text-step-n2">
              <input type="checkbox" checked={slot.enabled} onChange={(e) => update(slot.id, { enabled: e.target.checked })} className="size-4 accent-[var(--accent)]" />
              Show
            </label>
          </div>
          <p className="text-step-n2 text-ink-muted">{info.help}</p>
          {slot.enabled && (
            <div className="mt-3 space-y-2">
              <input value={slot.heading ?? ""} onChange={(e) => update(slot.id, { heading: e.target.value || null })} placeholder="Heading (optional; leave empty for the default)" aria-label={`${info.title} heading`} className="field min-h-10 py-1.5" />
              {info.picks && (
                <div className="space-y-1.5">
                  {slot.postIds.map((pid) => {
                    const s = stories.find((x) => x.id === pid);
                    return (
                      <div key={pid} className="flex items-center gap-2 rounded bg-sunken px-3 py-1.5 text-step-n1">
                        <span className="flex-1 truncate">{s?.title ?? "A story that is no longer published"}</span>
                        <button type="button" onClick={() => update(slot.id, { postIds: slot.postIds.filter((x) => x !== pid) })} aria-label={`Remove ${s?.title ?? "story"}`} className="inline-flex size-7 items-center justify-center rounded-full hover:bg-rule"><X aria-hidden size={14} /></button>
                      </div>
                    );
                  })}
                  {slot.postIds.length < info.picks && (
                    <select value="" onChange={(e) => e.target.value && update(slot.id, { postIds: [...slot.postIds, e.target.value] })} className="field min-h-10 py-1.5" aria-label={`Add a story to ${info.title}`}>
                      <option value="">{slot.section === "hero" ? "Choose the featured story…" : "Add a story…"}</option>
                      {featuredFirst.filter((s) => !slot.postIds.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.featured ? "★ " : ""}{s.title}</option>)}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
