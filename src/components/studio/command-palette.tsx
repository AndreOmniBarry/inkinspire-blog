"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { studioSearch } from "@/app/studio/actions/search";
import type { NavItem } from "./nav";

type Results = Awaited<ReturnType<typeof studioSearch>>;

/** ⌘K / Ctrl+K: jump to any story, page or reader, or run an action. */
export function CommandPalette({ items, canWrite }: { items: NavItem[]; canWrite: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("ink:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("ink:palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale results
      setResults(null);
      return;
    }
    const t = setTimeout(() => start(async () => setResults(await studioSearch(q))), 160);
    return () => clearTimeout(t);
  }, [q]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href as never);
  };

  if (!open) return null;
  const item = "flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-m)] px-3 text-step-n1 data-[selected=true]:bg-ink data-[selected=true]:text-bg";
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[12vh]" role="presentation">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_40%,transparent)]" onClick={() => setOpen(false)} />
      <Command label="Command menu" shouldFilter={false} className="relative w-full max-w-xl overflow-hidden rounded-[var(--radius-l)] border border-rule bg-surface shadow-2xl" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
        <div className="flex items-center gap-3 border-b border-rule px-4">
          <Search aria-hidden size={18} className="text-ink-muted" />
          <Command.Input autoFocus value={q} onValueChange={setQ} placeholder="Search stories, pages, readers, or type a command…" className="min-h-14 w-full bg-transparent text-step-0 outline-none placeholder:text-ink-muted" />
          <kbd className="hidden rounded border border-rule px-1.5 text-step-n2 text-ink-muted sm:block">Esc</kbd>
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-step-n1 text-ink-muted">Nothing found.</Command.Empty>
          {canWrite && (
            <Command.Group heading="Actions" className="px-1 pb-2 text-step-n2 text-ink-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              <Command.Item className={item} onSelect={() => go("/studio/write/new")}>New story</Command.Item>
              <Command.Item className={item} onSelect={() => go("/studio/library?status=scheduled")}>See scheduled stories</Command.Item>
              <Command.Item className={item} onSelect={() => go("/studio/library?status=pending_review")}>Review submitted stories</Command.Item>
            </Command.Group>
          )}
          {results?.stories.length ? (
            <Command.Group heading="Stories" className="px-1 pb-2 text-step-n2 text-ink-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              {results.stories.map((s) => (
                <Command.Item key={s.id} value={`story-${s.id}`} className={item} onSelect={() => go(`/studio/write/${s.id}`)}>
                  <span className="flex-1 truncate">{s.title}</span>
                  <span className="text-step-n2 opacity-70">{s.status.replace("_", " ")}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
          {results?.pages.length ? (
            <Command.Group heading="Pages" className="px-1 pb-2 text-step-n2 text-ink-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              {results.pages.map((p) => (
                <Command.Item key={p.id} value={`page-${p.id}`} className={item} onSelect={() => go(`/studio/pages/${p.id}`)}>{p.title}</Command.Item>
              ))}
            </Command.Group>
          ) : null}
          {results?.readers.length ? (
            <Command.Group heading="People" className="px-1 pb-2 text-step-n2 text-ink-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              {results.readers.map((r) => (
                <Command.Item key={r.id} value={`reader-${r.id}`} className={item} onSelect={() => go("/studio/settings#staff")}>
                  <span className="flex-1 truncate">{r.name}</span>
                  <span className="truncate text-step-n2 opacity-70">{r.email}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
          <Command.Group heading="Go to" className="px-1 text-step-n2 text-ink-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            {items
              .filter((i) => !q || i.label.toLowerCase().includes(q.toLowerCase()))
              .map((i) => (
                <Command.Item key={i.href} value={`nav-${i.href}`} className={item} onSelect={() => go(i.href)}>{i.label}</Command.Item>
              ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
