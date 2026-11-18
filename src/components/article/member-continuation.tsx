import Link from "next/link";
import { getContinuation } from "@/server/content/protected";
import { ButtonLink } from "@/components/ui/button";

/**
 * Renders at request time inside <Suspense>: the rest of a premium story for members, or a
 * designed invitation for everyone else. Never part of the cached page.
 */
export async function MemberContinuation({ postId, slug }: { postId: string; slug: string }) {
  const c = await getContinuation(postId);
  if (c.kind === "none") return null;
  if (c.kind === "full") {
    return <div className="prose-ink mx-auto mt-[1.15em]" dangerouslySetInnerHTML={{ __html: c.html }} />;
  }
  const next = encodeURIComponent(`/stories/${slug}`);
  const copy = {
    signed_out: {
      title: "The rest of this story is for members.",
      body: "Members read every story in full, including exclusive essays, letters and collections, and keep Inkinspire independent.",
    },
    not_member: {
      title: "The rest of this story is for members.",
      body: "Become a member to keep reading, and to read every exclusive story, letter and collection.",
    },
    expired: {
      title: "Welcome back. Your membership has ended.",
      body: "Renew to pick up where you left off. Everything you saved is still here.",
    },
  }[c.reason];
  return (
    <aside aria-labelledby="paywall-title" className="relative mx-auto mt-2 max-w-[var(--measure)]">
      {/* Soft fade over the last lines of the preview */}
      <div aria-hidden className="pointer-events-none absolute -top-28 right-0 left-0 h-28 bg-gradient-to-b from-transparent to-bg" />
      <div className="grain rounded-[var(--radius-l)] border border-rule bg-surface px-6 py-9 text-center md:px-10">
        <p className="ornament text-step-2" aria-hidden>
          ❦
        </p>
        <h2 id="paywall-title" className="mt-3 font-display text-step-3 leading-tight">
          {copy.title}
        </h2>
        <p className="mx-auto mt-3 max-w-[44ch] font-reading text-step-1 text-ink-soft">{copy.body}</p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href={`/membership?from=${next}`} size="lg">
            {c.reason === "expired" ? "Renew membership" : "Become a member"}
          </ButtonLink>
          {c.reason === "signed_out" && (
            <Link href={`/login?next=${next}`} className="min-h-11 px-3 py-2.5 text-step-n1 font-semibold underline-offset-4 hover:underline">
              Already a member? Sign in
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}

export function ContinuationSkeleton() {
  return (
    <div aria-hidden className="prose-ink mx-auto mt-6 space-y-3">
      {[92, 100, 86, 97, 60].map((w, i) => (
        <div key={i} className="h-4 animate-pulse rounded bg-sunken" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}
