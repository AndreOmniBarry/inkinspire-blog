"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Heart } from "lucide-react";
import { clsx } from "clsx";
import { getReaderState, recordProgress, toggleAppreciation, toggleBookmark, type ReaderState } from "@/app/actions/reader";

const signedInHint = () => typeof document !== "undefined" && document.cookie.split("; ").includes("ink_hint=1");

/**
 * Bookmark, appreciate and "resume where you left off". Reader state is fetched after load, so the
 * story page itself stays a cached static page for everyone.
 */
export function StoryActions({ postId, slug, readingMinutes, placement }: { postId: string; slug: string; readingMinutes: number; placement: "top" | "end" }) {
  const [state, setState] = useState<ReaderState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    getReaderState(postId)
      .then((s) => alive && setState(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [postId]);

  const next = encodeURIComponent(`/stories/${slug}`);
  const needSignIn = (what: string) => setMessage(what);

  const onBookmark = () =>
    start(async () => {
      const r = await toggleBookmark(postId);
      if (r.reason === "signed_out") return needSignIn("bookmark");
      if (r.ok) setState((s) => (s ? { ...s, bookmarked: !!r.bookmarked } : s));
    });
  const onAppreciate = () =>
    start(async () => {
      const r = await toggleAppreciation(postId);
      if (r.reason === "signed_out") return needSignIn("appreciate");
      if (r.ok)
        setState((s) => (s ? { ...s, appreciated: !!r.appreciated, appreciations: s.appreciations + (r.appreciated ? 1 : -1) } : s));
    });

  return (
    <div className={clsx("no-print", placement === "end" && "rounded-[var(--radius-l)] border border-rule bg-surface p-5 md:p-6")}>
      {placement === "end" && <p className="mb-4 font-display text-step-2">Did this story stay with you?</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAppreciate}
          disabled={pending}
          aria-pressed={!!state?.appreciated}
          className={clsx("share-pill", state?.appreciated && "border-accent text-accent")}
        >
          <Heart aria-hidden size={16} className={clsx(state?.appreciated && "fill-current")} />
          {state?.appreciated ? "Appreciated" : "Appreciate"}
          {!!state?.appreciations && <span className="tabular-nums text-ink-muted">{state.appreciations}</span>}
        </button>
        <button type="button" onClick={onBookmark} disabled={pending} aria-pressed={!!state?.bookmarked} className={clsx("share-pill", state?.bookmarked && "border-ink text-ink")}>
          {state?.bookmarked ? <BookmarkCheck aria-hidden size={16} /> : <Bookmark aria-hidden size={16} />}
          {state?.bookmarked ? "Saved" : "Save for later"}
        </button>
      </div>
      {message && (
        <p role="status" className="mt-3 text-step-n1 text-ink-soft">
          <Link href={`/login?next=${next}`} className="font-semibold text-accent underline">
            Sign in
          </Link>{" "}
          or{" "}
          <Link href={`/register?next=${next}`} className="font-semibold text-accent underline">
            create a free account
          </Link>{" "}
          to {message === "bookmark" ? "save stories and come back to them" : "appreciate stories"}.
        </p>
      )}
      {placement === "top" && state && state.progress > 8 && state.progress < 92 && <ResumePrompt progress={state.progress} />}
      {placement === "top" && <ProgressTracker postId={postId} readingMinutes={readingMinutes} signedIn={state?.signedIn ?? signedInHint()} />}
    </div>
  );
}

function ResumePrompt({ progress }: { progress: number }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-m)] bg-sunken px-4 py-3 text-step-n1">
      <span>You were {progress}% of the way through.</span>
      <button
        type="button"
        className="font-semibold text-accent underline underline-offset-4"
        onClick={() => {
          const el = document.getElementById("story-body");
          if (el) {
            const top = el.getBoundingClientRect().top + window.scrollY + (el.offsetHeight * progress) / 100 - window.innerHeight * 0.3;
            window.scrollTo({ top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
          }
          setHidden(true);
        }}
      >
        Continue where you left off
      </button>
    </div>
  );
}

/** Sends a view on load and a "read complete" when the reader genuinely finishes (depth + time). */
function ProgressTracker({ postId, readingMinutes, signedIn }: { postId: string; readingMinutes: number; signedIn: boolean }) {
  const maxDepth = useRef(0);
  const sentComplete = useRef(false);
  const lastSaved = useRef(0);
  useEffect(() => {
    const started = Date.now();
    const send = (body: object) =>
      navigator.sendBeacon?.("/api/analytics/beacon", new Blob([JSON.stringify({ postId, path: location.pathname, ref: document.referrer, ...body })], { type: "application/json" }));
    send({ type: "view" });
    const el = document.getElementById("story-body");
    const onScroll = () => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const depth = Math.min(100, Math.max(0, ((window.innerHeight - r.top) / r.height) * 100));
      maxDepth.current = Math.max(maxDepth.current, depth);
      const seconds = (Date.now() - started) / 1000;
      if (!sentComplete.current && maxDepth.current >= 90 && seconds >= Math.max(20, readingMinutes * 60 * 0.35)) {
        sentComplete.current = true;
        send({ type: "read_complete", scrollDepth: Math.round(maxDepth.current), seconds: Math.round(seconds) });
      }
      if (signedIn && Date.now() - lastSaved.current > 15000 && depth > 5) {
        lastSaved.current = Date.now();
        void recordProgress(postId, depth);
      }
    };
    const onHide = () => {
      if (signedIn && maxDepth.current > 5) void recordProgress(postId, maxDepth.current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onHide);
    };
  }, [postId, readingMinutes, signedIn]);
  return null;
}
