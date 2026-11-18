import type { Media } from "@/server/db/schema";

/**
 * Public URL for a stored object. With R2 configured, files are served from her R2 public domain
 * (e.g. media.inkinspire.com); otherwise from this app's /media route (local development).
 */
export function mediaUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL;
  return base ? `${base.replace(/\/$/, "")}/${key}` : `/media/${key}`;
}

/** Best responsive source set for a media row: AVIF/WebP variants by width. */
export function mediaSources(m: Pick<Media, "key" | "variants" | "width" | "height">) {
  const webp = m.variants?.webp ?? {};
  const avif = m.variants?.avif ?? {};
  const toSet = (v: Record<string, string>) =>
    Object.entries(v)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([w, k]) => `${mediaUrl(k)} ${w}w`)
      .join(", ");
  const largestWebp = Object.entries(webp).sort((a, b) => Number(b[0]) - Number(a[0]))[0]?.[1];
  return {
    src: largestWebp ? mediaUrl(largestWebp) : mediaUrl(m.key),
    srcSet: Object.keys(webp).length ? toSet(webp) : undefined,
    avifSet: Object.keys(avif).length ? toSet(avif) : undefined,
    width: m.width ?? undefined,
    height: m.height ?? undefined,
  };
}
