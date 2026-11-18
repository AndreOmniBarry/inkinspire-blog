import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { mark, wordmark } from "@/components/brand/logo-data";
import { palettes, type CategoryColour } from "@/styles/tokens";

/**
 * Social-card template (Open Graph / X): the "OG-image template" in the logo system.
 * Built only from public fields (title, subtitle, category, author), never story text.
 */
export const ogSize = { width: 1200, height: 630 };

const fonts = Promise.all([
  readFile(join(process.cwd(), "src/assets/og/fraunces-display.ttf")),
  readFile(join(process.cwd(), "src/assets/og/fraunces-italic.ttf")),
  readFile(join(process.cwd(), "src/assets/og/instrument-sans-semibold.ttf")),
]);

export async function ogImage(opts: { title: string; subtitle?: string | null; eyebrow?: string | null; byline?: string | null; colour?: CategoryColour; premium?: boolean }) {
  const [display, italic, sans] = await fonts;
  const p = palettes.paper;
  const [catBg, catInk] = p.categories[opts.colour ?? "oxblood"];
  const titleSize = opts.title.length > 70 ? 58 : opts.title.length > 42 ? 70 : 84;
  const markScale = 64 / mark.size;
  const wmScale = 34 / wordmark.height;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: p.bg, color: p.ink }}>
        <div style={{ width: 28, height: "100%", background: catBg, display: "flex" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "64px 80px 56px 72px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {opts.eyebrow && (
              <div style={{ display: "flex", fontFamily: "Instrument", fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: catInk, background: catBg, padding: "8px 16px", borderRadius: 999 }}>
                {opts.eyebrow}
              </div>
            )}
            {opts.premium && (
              <div style={{ display: "flex", fontFamily: "Instrument", fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: p.giltInk }}>★ Members</div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: titleSize, lineHeight: 1.04, letterSpacing: -1.5, maxWidth: 940 }}>{opts.title}</div>
            {opts.subtitle && (
              <div style={{ display: "flex", marginTop: 24, fontFamily: "FrauncesItalic", fontSize: 34, lineHeight: 1.3, color: p.inkSoft, maxWidth: 900 }}>{opts.subtitle}</div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontFamily: "Instrument", fontSize: 24, color: p.inkMuted }}>{opts.byline ?? ""}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <svg width={mark.size * markScale * 0.62} height={mark.size * markScale * 0.62} viewBox={`0 0 ${mark.size} ${mark.size}`}>
                <path d={`${mark.drop} ${mark.nib}`} fill={p.accent} fillRule="evenodd" />
                <circle cx={mark.dot.cx} cy={mark.dot.cy} r={mark.dot.r} fill={p.gilt} />
              </svg>
              <svg width={wordmark.width * wmScale} height={34} viewBox={`0 0 ${wordmark.width} ${wordmark.height}`}>
                <path d={wordmark.path} fill={p.ink} />
              </svg>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Fraunces", data: display, style: "normal", weight: 400 },
        { name: "FrauncesItalic", data: italic, style: "normal", weight: 400 },
        { name: "Instrument", data: sans, style: "normal", weight: 600 },
      ],
    },
  );
}
