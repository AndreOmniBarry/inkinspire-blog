"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Coffee, MonitorSmartphone } from "lucide-react";
import { clsx } from "clsx";
import { readPrefs, savePrefs, type ThemePref } from "@/lib/reader-prefs";

const options: Array<{ value: ThemePref; label: string; Icon: typeof Sun }> = [
  { value: "paper", label: "Light", Icon: Sun },
  { value: "sepia", label: "Sepia", Icon: Coffee },
  { value: "midnight", label: "Dark", Icon: Moon },
  { value: "system", label: "Match my device", Icon: MonitorSmartphone },
];

/** Segmented radio group for Light / Sepia / Dark / System. Persists per device. */
export function ThemeSwitcher({ compact = false, className }: { compact?: boolean; className?: string }) {
  const [theme, setTheme] = useState<ThemePref>("system");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read device preference after hydration
    setTheme(readPrefs().theme);
    const on = (e: Event) => setTheme((e as CustomEvent).detail.theme);
    window.addEventListener("ink:prefs", on);
    return () => window.removeEventListener("ink:prefs", on);
  }, []);
  return (
    <div role="radiogroup" aria-label="Colour theme" className={clsx("inline-flex rounded-full border border-rule p-0.5", className)}>
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => savePrefs({ ...readPrefs(), theme: value })}
          className={clsx(
            "inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-full px-2.5 text-step-n1 transition-colors",
            theme === value ? "bg-ink text-bg" : "text-ink-soft hover:text-ink",
          )}
        >
          <Icon aria-hidden size={16} strokeWidth={1.75} />
          {!compact && <span className="pr-1">{label === "Match my device" ? "Auto" : label}</span>}
        </button>
      ))}
    </div>
  );
}
