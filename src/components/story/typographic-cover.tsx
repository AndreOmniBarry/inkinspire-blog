import { clsx } from "clsx";
import type { CategoryColour } from "@/styles/tokens";

/**
 * A designed cover for stories without an image, so poems and reflections never look empty.
 * Built from the title, the category's colour and an ornament: pure HTML/CSS, crisp at any size,
 * readable in every theme (each category pair is contrast-checked).
 */
const ornaments = ["❦", "⁂", "❧", "✻", "❦"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function TypographicCover({
  title,
  category,
  colour = "oxblood",
  size = "md",
  className,
  showTitle = true,
}: {
  title: string;
  category?: string | null;
  colour?: CategoryColour;
  size?: "sm" | "md" | "lg";
  className?: string;
  showTitle?: boolean;
}) {
  const h = hash(title);
  const ornament = ornaments[h % ornaments.length];
  const variant = h % 3; // composition: 0 centred, 1 lower-left, 2 framed
  return (
    <div
      aria-hidden="true"
      className={clsx("grain relative isolate flex h-full w-full overflow-hidden", className)}
      style={{ background: `var(--cat-${colour}-bg)`, color: `var(--cat-${colour}-ink)` }}
    >
      {/* Large, faint ornament as texture */}
      <span
        className="pointer-events-none absolute font-display leading-none opacity-[0.09] select-none"
        style={{
          fontSize: size === "lg" ? "32rem" : size === "md" ? "18rem" : "9rem",
          right: variant === 1 ? "-0.12em" : "auto",
          left: variant === 1 ? "auto" : "50%",
          top: variant === 2 ? "50%" : "-0.18em",
          transform: variant === 1 ? "none" : variant === 2 ? "translate(-50%,-50%)" : "translateX(-50%)",
        }}
      >
        {ornament}
      </span>
      {variant === 2 && <span className="pointer-events-none absolute inset-3 border border-current opacity-25 md:inset-4" />}
      <div
        className={clsx(
          "relative z-10 flex w-full flex-col p-[8%]",
          variant === 0 && "items-center justify-center text-center",
          variant === 1 && "justify-end",
          variant === 2 && "items-center justify-center text-center",
        )}
      >
        {category && size !== "sm" && (
          <span className="mb-3 font-ui text-[0.68em] font-semibold tracking-[0.18em] uppercase opacity-80">{category}</span>
        )}
        {showTitle && (
          <span
            className={clsx(
              "font-display leading-[1.05] tracking-[-0.015em] text-balance",
              size === "lg" && "text-[clamp(2rem,5vw,3.6rem)]",
              size === "md" && "text-[clamp(1.35rem,3.2vw,1.9rem)]",
              size === "sm" && "text-[1.05rem]",
            )}
            style={{ fontVariationSettings: '"opsz" 144', fontStyle: h % 2 ? "italic" : "normal" }}
          >
            {title}
          </span>
        )}
        <span className="mt-4 font-display text-[1.1em] opacity-70">{ornament}</span>
      </div>
    </div>
  );
}
