import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { formatDate } from "@/lib/format";

/** Exactly how the story will read, before it is published. Staff only; never cached. */
export default async function PreviewPage({ params }: PageProps<"/studio/preview/[id]">) {
  const user = await requireStaff("post.create");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const post = await db.query.posts.findFirst({ where: eq(schema.posts.id, id) });
  if (!post || !(can(user.role, "post.edit.any") || post.createdById === user.id)) notFound();
  return (
    <article className="pb-24">
      <div className="sticky top-0 z-10 border-b border-rule bg-sunken px-4 py-2 text-center text-step-n1">
        Preview · not yet public ·{" "}
        <Link href={`/studio/write/${post.id}`} className="font-semibold underline">Back to editing</Link>
      </div>
      <header className="container-ink pt-12 text-center">
        <h1 className="mx-auto max-w-3xl font-display text-step-5 leading-[1.04]">{post.title || "Untitled"}</h1>
        {post.subtitle && <p className="mx-auto mt-4 max-w-[42ch] font-reading text-step-2 text-ink-soft italic">{post.subtitle}</p>}
        <p className="mt-5 text-step-n1 text-ink-muted">{formatDate(post.scheduledAt ?? post.publishedAt ?? new Date())} · {post.readingMinutes} min read</p>
      </header>
      <div className="container-ink mt-12">
        <div className="prose-ink mx-auto" dangerouslySetInnerHTML={{ __html: post.previewHtml }} />
        {post.visibility === "premium" && (
          <>
            <div className="mx-auto my-10 max-w-[var(--measure)]"><div className="ink-paywall">Members only below this line</div></div>
            <div className="prose-ink mx-auto" dangerouslySetInnerHTML={{ __html: post.bodyHtml.startsWith(post.previewHtml) ? post.bodyHtml.slice(post.previewHtml.length) : post.bodyHtml }} />
          </>
        )}
      </div>
    </article>
  );
}
