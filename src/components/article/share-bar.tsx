"use client";

import { useState } from "react";
import { Link2, Check, Share2 } from "lucide-react";
import { clsx } from "clsx";

/** Share: WhatsApp first (how most Nigerian readers share), then X, Facebook, LinkedIn, copy link, native share. */
export function ShareBar({ url, title, className }: { url: string; title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const text = `${title}`;
  const enc = encodeURIComponent;
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${text} ${url}`)}` },
    { label: "X", href: `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
  ];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };
  const nativeShare = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      /* dismissed */
    }
  };
  const beacon = (channel: string) =>
    navigator.sendBeacon?.("/api/analytics/beacon", new Blob([JSON.stringify({ type: "share", path: location.pathname, query: channel })], { type: "application/json" }));
  return (
    <div className={clsx("flex flex-wrap items-center gap-2", className)}>
      <span className="eyebrow mr-1">Share</span>
      {typeof navigator !== "undefined" && "share" in navigator && (
        <button type="button" onClick={nativeShare} className="share-pill sm:hidden" aria-label="Share using your phone">
          <Share2 aria-hidden size={15} /> Share
        </button>
      )}
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="share-pill" onClick={() => beacon(l.label)}>
          {l.label}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
      <button type="button" onClick={copy} className="share-pill" aria-live="polite">
        {copied ? <Check aria-hidden size={15} /> : <Link2 aria-hidden size={15} />}
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
