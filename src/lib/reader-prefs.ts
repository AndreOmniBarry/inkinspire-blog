/**
 * Reading preferences: theme, text size, body font. Stored per device in localStorage
 * (and per account when signed in, Phase 2). Applied before first paint by THEME_SCRIPT,
 * so there is no flash and no layout shift.
 */
export type ThemePref = "system" | "paper" | "sepia" | "midnight";
export type FontPref = "serif" | "sans";
export type ReaderPrefs = { theme: ThemePref; size: 1 | 2 | 3 | 4 | 5; font: FontPref };

export const PREFS_KEY = "ink:prefs";
export const defaultPrefs: ReaderPrefs = { theme: "system", size: 3, font: "serif" };

/** Inline, render-blocking, tiny. Keep in sync with applyPrefs(). */
export const THEME_SCRIPT = `(function(){try{var d=document.documentElement,p=JSON.parse(localStorage.getItem("${PREFS_KEY}")||"{}"),t=p.theme||"system";if(t==="system")t=matchMedia("(prefers-color-scheme: dark)").matches?"midnight":"paper";d.dataset.theme=t;if(p.size&&p.size!==3)d.dataset.textSize=String(p.size);if(p.font==="sans")d.dataset.readingFont="sans";var c=navigator.connection;if(c&&c.saveData)d.dataset.saveData="on"}catch(e){document.documentElement.dataset.theme="paper"}})()`;

export function resolveTheme(theme: ThemePref): Exclude<ThemePref, "system"> {
  if (theme !== "system") return theme;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "midnight" : "paper";
}

export function readPrefs(): ReaderPrefs {
  try {
    return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
  } catch {
    return defaultPrefs;
  }
}

export function applyPrefs(p: ReaderPrefs) {
  const d = document.documentElement;
  d.dataset.theme = resolveTheme(p.theme);
  if (p.size === 3) delete d.dataset.textSize;
  else d.dataset.textSize = String(p.size);
  if (p.font === "sans") d.dataset.readingFont = "sans";
  else delete d.dataset.readingFont;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", getComputedStyle(d).getPropertyValue("--bg").trim());
}

export function savePrefs(p: ReaderPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* private mode: preferences last for this visit only */
  }
  applyPrefs(p);
  window.dispatchEvent(new CustomEvent("ink:prefs", { detail: p }));
}
