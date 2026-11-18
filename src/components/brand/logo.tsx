import { mark, wordmark } from "./logo-data";

type Props = {
  /** Height in px of the whole lock-up. */
  height?: number;
  variant?: "full" | "mark" | "wordmark";
  className?: string;
  title?: string;
};

/** The Inkinspire lock-up as inline SVG: inherits text colour, accent drop, gilt dot. */
export function Logo({ height = 32, variant = "full", className, title = "Inkinspire" }: Props) {
  const markScale = wordmark.height / mark.size; // mark spans the wordmark's full height
  const markW = variant === "wordmark" ? 0 : mark.size * markScale;
  const gap = variant === "full" ? wordmark.height * 0.28 : 0;
  const wordW = variant === "mark" ? 0 : wordmark.width;
  const vbW = markW + gap + wordW;
  const width = (vbW / wordmark.height) * height;
  return (
    <svg
      role="img"
      aria-label={title}
      viewBox={`0 0 ${vbW.toFixed(1)} ${wordmark.height}`}
      width={width}
      height={height}
      className={className}
      focusable="false"
    >
      {variant !== "wordmark" && (
        <g transform={`scale(${markScale.toFixed(4)})`}>
          <path d={`${mark.drop} ${mark.nib}`} fill="var(--accent)" fillRule="evenodd" />
          <circle cx={mark.dot.cx} cy={mark.dot.cy} r={mark.dot.r} fill="var(--gilt)" />
        </g>
      )}
      {variant !== "mark" && (
        <path d={wordmark.path} transform={`translate(${(markW + gap).toFixed(1)} 0)`} fill="currentColor" />
      )}
    </svg>
  );
}
