import type { SocialNetwork } from "@/server/db/schema";

const labels: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  x: "X",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  website: "Website",
  email: "Email",
};

/** Text links (not icon-only): readable, accessible, brand-neutral. Renders nothing until set in Studio. */
export function SocialLinks({ socials, className }: { socials: Partial<Record<SocialNetwork, string>>; className?: string }) {
  const entries = (Object.entries(socials) as Array<[SocialNetwork, string]>).filter(([, v]) => v);
  if (!entries.length) return <span className={className} />;
  return (
    <ul className={className ?? "flex flex-wrap gap-x-5 gap-y-2 text-step-n1"} aria-label="Follow Inkinspire">
      {entries.map(([k, v]) => (
        <li key={k}>
          <a
            href={k === "email" ? `mailto:${v}` : v}
            rel="noopener noreferrer me"
            target={k === "email" ? undefined : "_blank"}
            className="link-quiet font-medium text-ink-soft hover:text-ink"
          >
            {labels[k]}
          </a>
        </li>
      ))}
    </ul>
  );
}
