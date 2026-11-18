import { clsx } from "clsx";
import type { StoryCover } from "@/server/content/public";
import type { CategoryColour } from "@/styles/tokens";
import { TypographicCover } from "./typographic-cover";

/**
 * Story cover: the uploaded image (AVIF/WebP, responsive, blurred placeholder, focal point)
 * or, when there is none, a generated typographic cover.
 */
export function Cover({
  cover,
  title,
  category,
  colour,
  sizes,
  priority = false,
  ratio = "3/2",
  size = "md",
  className,
  showTitle = true,
}: {
  cover: StoryCover | null;
  title: string;
  category?: string | null;
  colour?: CategoryColour;
  sizes: string;
  priority?: boolean;
  ratio?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showTitle?: boolean;
}) {
  return (
    <div className={clsx("relative overflow-hidden rounded-[var(--radius-s)] bg-sunken", className)} style={{ aspectRatio: ratio }}>
      {cover ? (
        <picture>
          {cover.avifSet && <source type="image/avif" srcSet={cover.avifSet} sizes={sizes} />}
          {cover.srcSet && <source type="image/webp" srcSet={cover.srcSet} sizes={sizes} />}
          {/* eslint-disable-next-line @next/next/no-img-element -- variants are pre-generated at upload; no runtime optimiser cost */}
          <img
            src={cover.src}
            alt={cover.alt}
            width={cover.width}
            height={cover.height}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: `${cover.focalX}% ${cover.focalY}%`,
              backgroundImage: cover.placeholder ? `url(${cover.placeholder})` : undefined,
              backgroundSize: "cover",
            }}
          />
        </picture>
      ) : (
        <TypographicCover title={title} category={category} colour={colour} size={size} showTitle={showTitle} className="absolute inset-0" />
      )}
    </div>
  );
}
