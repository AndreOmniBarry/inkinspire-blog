"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { reschedule } from "@/app/studio/actions/calendar";

type Item = { id: string; title: string; status: "scheduled" | "published"; day: string; time: string };

/** Month or week view in Lagos time. Drag a scheduled story to another day to reschedule it. */
export function EditorialCalendar({ items, month, today }: { items: Item[]; month: string; today: string }) {
  const [view, setView] = useState<"month" | "week">("month");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const router = useRouter();
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const startOffset = (first.getUTCDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthDays = Array.from({ length: Math.ceil((startOffset + daysInMonth) / 7) * 7 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1, i - startOffset + 1));
    return d.toISOString().slice(0, 10);
  });
  const t = new Date(`${today}T00:00:00Z`);
  const weekStart = new Date(t.getTime() - ((t.getUTCDay() + 6) % 7) * 864e5);
  const weekDays = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 864e5).toISOString().slice(0, 10));
  const days = view === "month" ? monthDays : weekDays;
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  const label = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);

  const drop = (day: string) => {
    if (!dragId) return;
    const id = dragId;
    setDragId(null);
    start(async () => {
      const r = await reschedule(id, day);
      setError(r.ok ? null : r.error);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {view === "month" && (
          <div className="flex items-center gap-1">
            <Link href={`/studio/calendar?month=${prev}`} className="share-pill" aria-label="Previous month">←</Link>
            <h2 className="min-w-40 text-center font-display text-step-2">{label}</h2>
            <Link href={`/studio/calendar?month=${next}`} className="share-pill" aria-label="Next month">→</Link>
          </div>
        )}
        <div role="radiogroup" aria-label="View" className="ml-auto inline-flex rounded-full border border-rule p-0.5">
          {(["month", "week"] as const).map((v) => <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)} className={clsx("min-h-9 rounded-full px-4 text-step-n1 font-semibold capitalize", view === v ? "bg-ink text-bg" : "text-ink-soft")}>{v === "week" ? "This week" : "Month"}</button>)}
        </div>
      </div>
      {error && <p role="alert" className="mb-3 text-step-n1 text-danger">{error}</p>}
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[var(--radius-l)] border border-rule bg-rule text-step-n2" aria-busy={pending}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="bg-sunken px-2 py-1.5 text-center font-semibold text-ink-soft">{d}</div>)}
        {days.map((d) => {
          const dayItems = items.filter((i) => i.day === d);
          const inMonth = d.slice(0, 7) === month || view === "week";
          return (
            <div
              key={d}
              onDragOver={(e) => { if (dragId) e.preventDefault(); }}
              onDrop={() => drop(d)}
              className={clsx("min-h-24 bg-surface p-1.5 md:min-h-28", !inMonth && "bg-bg opacity-60", view === "week" && "min-h-64")}
            >
              <p className={clsx("mb-1 text-right tabular-nums", d === today ? "font-bold text-accent" : "text-ink-muted")}>{Number(d.slice(8))}</p>
              <ul className="space-y-1">
                {dayItems.map((i) => (
                  <li key={i.id}>
                    <Link
                      href={`/studio/write/${i.id}`}
                      draggable={i.status === "scheduled"}
                      onDragStart={() => setDragId(i.id)}
                      onDragEnd={() => setDragId(null)}
                      title={`${i.title} · ${i.time}`}
                      className={clsx("block truncate rounded px-1.5 py-1 leading-tight", i.status === "scheduled" ? "cursor-grab bg-[color-mix(in_srgb,var(--gilt)_22%,transparent)] text-gilt-ink" : "bg-sunken text-ink-soft")}
                    >
                      <span className="font-semibold">{i.time}</span> {i.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-3 flex flex-wrap gap-4 text-step-n2 text-ink-soft">
        <span className="flex items-center gap-1.5"><span aria-hidden className="size-3 rounded bg-[color-mix(in_srgb,var(--gilt)_22%,transparent)]" /> Scheduled (drag to move)</span>
        <span className="flex items-center gap-1.5"><span aria-hidden className="size-3 rounded bg-sunken" /> Published</span>
        <span>All times are Lagos time (WAT).</span>
      </p>
    </div>
  );
}
