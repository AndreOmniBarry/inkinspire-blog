import { getSiteSettings } from "@/server/settings";
import { ogImage, ogSize } from "@/lib/og";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "Inkinspire: stories, poetry and reflections";

export default async function Image() {
  const s = await getSiteSettings();
  return ogImage({ title: s.identity.tagline, subtitle: "Stories, poetry and reflections by Xenia, the Storyteller", eyebrow: "A literary journal" });
}
