"use client";

import { useEffect, useRef } from "react";

/** Thin gilt progress line at the top of the viewport. No re-renders: writes a transform directly. */
export function ReadingProgress({ targetId = "story-body" }: { targetId?: string }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el || !bar.current) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      const p = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
      bar.current!.style.transform = `scaleX(${p})`;
      bar.current!.parentElement!.setAttribute("aria-valuenow", String(Math.round(p * 100)));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [targetId]);
  return (
    <div
      role="progressbar"
      aria-label="Reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      className="no-print pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]"
    >
      <div ref={bar} className="h-full origin-left bg-gilt" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}
