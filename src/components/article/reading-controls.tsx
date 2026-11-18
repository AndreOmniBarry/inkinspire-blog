"use client";

import { useEffect, useRef, useState } from "react";
import { Type, Minus, Plus, Maximize2, Minimize2, X } from "lucide-react";
import { clsx } from "clsx";
import { readPrefs, savePrefs, type ReaderPrefs } from "@/lib/reader-prefs";
import { ThemeSwitcher } from "@/components/site/theme-switcher";

/**
 * Reading controls (blueprint 5.7): text size (5 steps), Light/Sepia/Dark, serif or sans,
 * and focus mode, which hides everything but the words. Preferences persist on this device.
 */
export function ReadingControls() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<ReaderPrefs | null>(null);
  const [focus, setFocus] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- device preferences exist only in the browser
    setPrefs(readPrefs());
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-focus-mode", focus);
    return () => document.documentElement.removeAttribute("data-focus-mode");
  }, [focus]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const update = (patch: Partial<ReaderPrefs>) => {
    const next = { ...(prefs ?? readPrefs()), ...patch } as ReaderPrefs;
    setPrefs(next);
    savePrefs(next);
  };
  const size = prefs?.size ?? 3;

  return (
    <div className="no-print relative">
      {focus ? (
        <button
          type="button"
          onClick={() => setFocus(false)}
          className="fixed top-4 right-4 z-50 inline-flex min-h-11 items-center gap-2 rounded-full border border-rule bg-surface/90 px-4 text-step-n1 font-semibold backdrop-blur"
        >
          <Minimize2 aria-hidden size={16} /> Leave focus mode
        </button>
      ) : (
        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls="reading-controls"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-rule px-4 text-step-n1 font-semibold text-ink-soft hover:border-rule-strong hover:text-ink"
        >
          <Type aria-hidden size={16} /> Reading settings
        </button>
      )}
      {open && !focus && (
        <div
          ref={panel}
          id="reading-controls"
          role="group"
          aria-label="Reading settings"
          className="absolute right-0 z-40 mt-2 w-[min(21rem,calc(100vw-2rem))] rounded-[var(--radius-l)] border border-rule bg-surface p-5 shadow-[0_24px_60px_-28px_rgb(0_0_0/0.35)] motion-safe:animate-[fade-up_180ms_var(--ease-out)]"
        >
          <div className="flex items-center justify-between">
            <p className="eyebrow">Reading settings</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close reading settings" className="-mr-2 inline-flex size-9 items-center justify-center rounded-full hover:bg-sunken">
              <X aria-hidden size={16} />
            </button>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-2 text-step-n1 font-semibold">Text size</legend>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => update({ size: Math.max(1, size - 1) as ReaderPrefs["size"] })} disabled={size <= 1} aria-label="Smaller text" className="inline-flex size-11 items-center justify-center rounded-full border border-rule disabled:opacity-40">
                <Minus aria-hidden size={16} />
              </button>
              <div className="flex flex-1 items-end justify-between px-1" aria-hidden>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={clsx("font-reading leading-none", n === size ? "text-accent" : "text-ink-muted")} style={{ fontSize: `${0.8 + n * 0.14}rem` }}>
                    A
                  </span>
                ))}
              </div>
              <button type="button" onClick={() => update({ size: Math.min(5, size + 1) as ReaderPrefs["size"] })} disabled={size >= 5} aria-label="Larger text" className="inline-flex size-11 items-center justify-center rounded-full border border-rule disabled:opacity-40">
                <Plus aria-hidden size={16} />
              </button>
            </div>
            <p className="sr-only" aria-live="polite">
              Text size {size} of 5
            </p>
          </fieldset>

          <div className="mt-5">
            <p className="mb-2 text-step-n1 font-semibold">Theme</p>
            <ThemeSwitcher />
          </div>

          <fieldset className="mt-5">
            <legend className="mb-2 text-step-n1 font-semibold">Typeface</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup">
              {(["serif", "sans"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={(prefs?.font ?? "serif") === f}
                  onClick={() => update({ font: f })}
                  className={clsx(
                    "min-h-11 rounded-[var(--radius-m)] border px-3 text-step-0",
                    (prefs?.font ?? "serif") === f ? "border-ink bg-ink text-bg" : "border-rule hover:border-rule-strong",
                    f === "serif" ? "font-reading" : "font-ui",
                  )}
                >
                  {f === "serif" ? "Serif" : "Sans serif"}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setFocus(true);
            }}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-4 text-step-n1 font-semibold text-on-accent hover:bg-accent-hover"
          >
            <Maximize2 aria-hidden size={16} /> Focus mode
          </button>
        </div>
      )}
    </div>
  );
}
