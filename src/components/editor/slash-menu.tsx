"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";

export type SlashItem = { id: string; label: string; hint: string; keywords: string; run: (e: Editor) => void };

/** "/" at the start of an empty line opens the block menu. Arrow keys + Enter, or click. */
export function SlashMenu({ editor, items }: { editor: Editor | null; items: SlashItem[] }) {
  const [state, setState] = useState<{ query: string; top: number; left: number; from: number } | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const check = () => {
      const { $from, empty } = editor.state.selection;
      if (!empty || $from.parent.type.name !== "paragraph") return setState(null);
      const text = $from.parent.textContent;
      if (!/^\/[a-z ]*$/i.test(text) || $from.parentOffset !== text.length) return setState(null);
      const coords = editor.view.coordsAtPos($from.pos);
      setState({ query: text.slice(1).toLowerCase(), top: coords.bottom + window.scrollY + 6, left: coords.left + window.scrollX, from: $from.start() });
      setIndex(0);
    };
    editor.on("selectionUpdate", check);
    editor.on("update", check);
    return () => {
      editor.off("selectionUpdate", check);
      editor.off("update", check);
    };
  }, [editor]);

  const filtered = useMemo(
    () => (state ? items.filter((i) => !state.query || i.label.toLowerCase().includes(state.query) || i.keywords.includes(state.query)) : []),
    [items, state],
  );

  useEffect(() => {
    if (!editor || !state) return;
    const onKey = (e: KeyboardEvent) => {
      if (!filtered.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        choose(filtered[index]);
      } else if (e.key === "Escape") {
        setState(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const choose = (item: SlashItem) => {
    if (!editor || !state) return;
    const { $from } = editor.state.selection;
    editor.chain().focus().deleteRange({ from: state.from, to: $from.pos }).run();
    item.run(editor);
    setState(null);
  };

  if (!state || !filtered.length) return null;
  return (
    <div role="listbox" aria-label="Insert a block" className="absolute z-50 w-72 overflow-hidden rounded-[var(--radius-m)] border border-rule bg-surface p-1 shadow-xl" style={{ top: state.top, left: Math.min(state.left, window.innerWidth - 300) }}>
      {filtered.map((item, i) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={i === index}
          onMouseDown={(e) => {
            e.preventDefault();
            choose(item);
          }}
          onMouseEnter={() => setIndex(i)}
          className={clsx("flex w-full flex-col items-start rounded px-3 py-2 text-left", i === index ? "bg-ink text-bg" : "hover:bg-sunken")}
        >
          <span className="text-step-n1 font-semibold">{item.label}</span>
          <span className={clsx("text-step-n2", i === index ? "opacity-80" : "text-ink-muted")}>{item.hint}</span>
        </button>
      ))}
    </div>
  );
}
