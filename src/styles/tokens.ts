/**
 * Inkinspire design tokens: the single source of truth for colour, type, space and motion.
 *
 * `pnpm tokens` generates `src/styles/tokens.css` from this file, and `pnpm check:contrast`
 * proves every text/background pair below meets WCAG 2.2 AA in every theme. CI runs both.
 * Change a value here, never in the CSS.
 */

export type ThemeName = "paper" | "sepia" | "midnight";

export const themeNames: ThemeName[] = ["paper", "sepia", "midnight"];

/** Category palette keys. Stored on `categories.colour`; each maps to a cover background + ink per theme. */
export const categoryColours = [
  "oxblood",
  "indigo",
  "moss",
  "ochre",
  "plum",
  "teal",
  "slate",
  "rust",
] as const;
export type CategoryColour = (typeof categoryColours)[number];

type Palette = {
  /** Page background. */
  bg: string;
  /** Cards, panels, inputs. */
  surface: string;
  /** Slightly sunk areas: code, quotes, Studio canvas. */
  sunken: string;
  ink: string;
  inkSoft: string;
  /** Captions, metadata. Still AA on bg and surface. */
  inkMuted: string;
  rule: string;
  /** Hairlines that must be visible as UI boundaries (inputs): ≥ 3:1. */
  ruleStrong: string;
  accent: string;
  accentHover: string;
  /** Text on accent-filled buttons. */
  onAccent: string;
  /** Decorative gilt: ornaments, premium marks. */
  gilt: string;
  /** Gilt used as text or as a UI boundary (focus ring): AA. */
  giltInk: string;
  focus: string;
  success: string;
  warning: string;
  danger: string;
  /** Category covers: [background, ink]. */
  categories: Record<CategoryColour, [string, string]>;
};

export const palettes: Record<ThemeName, Palette> = {
  paper: {
    bg: "#FAF6EF",
    surface: "#FFFDF9",
    sunken: "#F3EDE2",
    ink: "#1B1A17",
    inkSoft: "#4A463F",
    inkMuted: "#6A6358",
    rule: "#E4DCCD",
    ruleStrong: "#8F8676",
    accent: "#7A1F2B",
    accentHover: "#5E1621",
    onAccent: "#FFFDF9",
    gilt: "#B08A3E",
    giltInk: "#7D5F22",
    focus: "#7D5F22",
    success: "#2F6A3F",
    warning: "#8A5A00",
    danger: "#A3222F",
    categories: {
      oxblood: ["#EBD8D6", "#4A1219"],
      indigo: ["#DCDFEC", "#1F2752"],
      moss: ["#DFE4D3", "#26361C"],
      ochre: ["#F0E2C4", "#4D3608"],
      plum: ["#E6D9E4", "#3F1B3A"],
      teal: ["#D5E6E3", "#123B37"],
      slate: ["#DEE1E3", "#22303A"],
      rust: ["#F0DBCD", "#55220A"],
    },
  },
  sepia: {
    bg: "#F3E9D6",
    surface: "#F8F0E1",
    sunken: "#ECE0C8",
    ink: "#2B241B",
    inkSoft: "#4F4434",
    inkMuted: "#665A47",
    rule: "#DCCDAF",
    ruleStrong: "#8C7D62",
    accent: "#7A1F2B",
    accentHover: "#5E1621",
    onAccent: "#FBF5EA",
    gilt: "#A5803A",
    giltInk: "#735420",
    focus: "#735420",
    success: "#2E6339",
    warning: "#7E5200",
    danger: "#9C1F2B",
    categories: {
      oxblood: ["#E5CFC6", "#4A1219"],
      indigo: ["#D9D7DD", "#1F2752"],
      moss: ["#DCDBC2", "#26361C"],
      ochre: ["#EBD7AE", "#4D3608"],
      plum: ["#E0CFD0", "#3F1B3A"],
      teal: ["#D0DACF", "#123B37"],
      slate: ["#D9D6CE", "#22303A"],
      rust: ["#EBCFB8", "#55220A"],
    },
  },
  midnight: {
    bg: "#14120F",
    surface: "#1C1915",
    sunken: "#100E0C",
    ink: "#EDE6D8",
    inkSoft: "#C9C0B0",
    inkMuted: "#A69D8D",
    rule: "#332E27",
    ruleStrong: "#7A7163",
    accent: "#D98A93",
    accentHover: "#E8A8AF",
    onAccent: "#1A0C0E",
    gilt: "#D1AE63",
    giltInk: "#D9B970",
    focus: "#D9B970",
    success: "#86C496",
    warning: "#E2B45C",
    danger: "#F08C95",
    categories: {
      oxblood: ["#3A1D20", "#F2D3D5"],
      indigo: ["#1F2338", "#D7DBF2"],
      moss: ["#222B1D", "#D9E5CB"],
      ochre: ["#352A15", "#F0DDB2"],
      plum: ["#2F1D2D", "#EDD4E8"],
      teal: ["#152B29", "#C9E8E3"],
      slate: ["#1F262B", "#D5DEE4"],
      rust: ["#3A2216", "#F3D4C1"],
    },
  },
};

/**
 * Pairs that must pass. `large` = only used for ≥ 24px text or ≥ 18.66px bold, or as non-text UI (3:1).
 * Every theme is checked against every pair.
 */
export const contrastPairs: Array<{
  fg: keyof Omit<Palette, "categories">;
  bg: keyof Omit<Palette, "categories">;
  large?: boolean;
  note: string;
}> = [
  { fg: "ink", bg: "bg", note: "body text" },
  { fg: "ink", bg: "surface", note: "text on cards" },
  { fg: "ink", bg: "sunken", note: "text on sunken panels" },
  { fg: "inkSoft", bg: "bg", note: "secondary text" },
  { fg: "inkSoft", bg: "surface", note: "secondary text on cards" },
  { fg: "inkSoft", bg: "sunken", note: "secondary text on sunken" },
  { fg: "inkMuted", bg: "bg", note: "metadata, captions" },
  { fg: "inkMuted", bg: "surface", note: "metadata on cards" },
  { fg: "inkMuted", bg: "sunken", note: "metadata on sunken" },
  { fg: "accent", bg: "bg", note: "links" },
  { fg: "accent", bg: "surface", note: "links on cards" },
  { fg: "accentHover", bg: "bg", note: "hovered links" },
  { fg: "onAccent", bg: "accent", note: "primary buttons" },
  { fg: "onAccent", bg: "accentHover", note: "hovered primary buttons" },
  { fg: "giltInk", bg: "bg", note: "premium label text" },
  { fg: "giltInk", bg: "surface", note: "premium label on cards" },
  { fg: "focus", bg: "bg", large: true, note: "focus ring (non-text, 3:1)" },
  { fg: "focus", bg: "surface", large: true, note: "focus ring on cards" },
  { fg: "ruleStrong", bg: "bg", large: true, note: "input borders (non-text, 3:1)" },
  { fg: "ruleStrong", bg: "surface", large: true, note: "input borders on cards" },
  { fg: "success", bg: "surface", note: "success messages" },
  { fg: "warning", bg: "surface", note: "warning messages" },
  { fg: "danger", bg: "surface", note: "error messages" },
  { fg: "danger", bg: "bg", note: "error messages on page" },
];

/** Fluid modular type scale (ratio ≈ 1.25 on mobile → 1.333 on desktop), 360px → 1440px. */
export const typeScale: Record<string, string> = {
  "-2": "clamp(0.75rem, 0.73rem + 0.08vw, 0.8rem)",
  "-1": "clamp(0.875rem, 0.85rem + 0.1vw, 0.94rem)",
  "0": "clamp(1rem, 0.97rem + 0.14vw, 1.09rem)",
  "1": "clamp(1.19rem, 1.13rem + 0.28vw, 1.4rem)",
  "2": "clamp(1.42rem, 1.31rem + 0.5vw, 1.86rem)",
  "3": "clamp(1.7rem, 1.51rem + 0.84vw, 2.48rem)",
  "4": "clamp(2.03rem, 1.73rem + 1.33vw, 3.3rem)",
  "5": "clamp(2.43rem, 1.97rem + 2.05vw, 4.4rem)",
  "6": "clamp(2.9rem, 2.2rem + 3.1vw, 5.86rem)",
};

/** Article body: 19px on a 360px phone → 21px on desktop. */
export const readingSize = "clamp(1.1875rem, 1.145rem + 0.19vw, 1.3125rem)";

/** Spacing scale (4px base, then modular). */
export const space: Record<string, string> = {
  "3xs": "0.25rem",
  "2xs": "0.5rem",
  xs: "0.75rem",
  s: "1rem",
  m: "1.5rem",
  l: "2rem",
  xl: "3rem",
  "2xl": "4.5rem",
  "3xl": "7rem",
};

export const radius = { s: "4px", m: "8px", l: "14px", pill: "999px" };

export const motion = {
  fast: "120ms",
  base: "220ms",
  slow: "420ms",
  ease: "cubic-bezier(0.2, 0, 0, 1)",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
};
