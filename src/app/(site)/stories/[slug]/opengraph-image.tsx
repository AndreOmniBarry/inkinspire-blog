import { getStory } from "@/server/content/public";
import { ogImage, ogSize } from "@/lib/og";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "Inkinspire story";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const story = await getStory((await params).slug);
  return ogImage({
    title: story?.title ?? "Inkinspire",
    subtitle: story?.subtitle,
    eyebrow: story?.category?.name,
    byline: story?.authors.map((a) => a.name).join(" & "),
    colour: story?.category?.colour,
    premium: story?.visibility === "premium",
  });
}
