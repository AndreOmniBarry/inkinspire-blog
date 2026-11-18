import Link from "next/link";
import { clsx } from "clsx";
import { requireStaff } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { getLibrary } from "@/server/studio/library";
import { StudioHeader, StudioSection, EmptyState } from "@/components/studio/page-header";
import { LibraryTable } from "@/components/studio/library-table";

export const metadata = { title: "Stories" };

const tabs = [
  ["", "All"],
  ["draft", "Drafts"],
  ["pending_review", "Pending review"],
  ["scheduled", "Scheduled"],
  ["published", "Published"],
  ["archived", "Archived"],
] as const;

export default async function LibraryPage({ searchParams }: PageProps<"/studio/library">) {
  const user = await requireStaff("post.create");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const search = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const category = typeof sp.category === "string" && /^[0-9a-f-]{36}$/.test(sp.category) ? sp.category : "";
  const page = Number(sp.page) || 1;
  const data = await getLibrary(user, { status, search, category, page });
  const all = Object.values(data.counts).reduce((a, b) => a + b, 0);
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(status && { status }), ...(search && { q: search }), ...(category && { category }), ...patch });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    const s = p.toString();
    return `/studio/library${s ? `?${s}` : ""}`;
  };
  return (
    <>
      <StudioHeader
        title="Stories"
        description={can(user.role, "post.edit.any") ? "Every story on Inkinspire, newest changes first." : "Your stories. Submit a draft for review when it’s ready."}
        actions={<Link href="/studio/write/new" className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-step-n1 font-semibold text-on-accent hover:bg-accent-hover">New story</Link>}
      />
      <StudioSection>
        <nav aria-label="Filter by status" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
          {tabs.map(([value, label]) => {
            const n = value ? (data.counts[value] ?? 0) : all;
            return (
              <Link key={value} href={qs({ status: value, page: "" }) as never} aria-current={status === value ? "page" : undefined} className={clsx("inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-step-n1 font-medium", status === value ? "bg-ink text-bg" : "text-ink-soft hover:bg-sunken")}>
                {label} <span className="tabular-nums opacity-70">{n}</span>
              </Link>
            );
          })}
        </nav>
        <form className="mt-4 flex flex-wrap gap-2" action="/studio/library">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="lib-q" className="sr-only">Search stories</label>
          <input id="lib-q" name="q" defaultValue={search} placeholder="Search by title…" className="field max-w-sm flex-1" />
          <label htmlFor="lib-cat" className="sr-only">Theme</label>
          <select id="lib-cat" name="category" defaultValue={category} className="field w-auto">
            <option value="">All themes</option>
            {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="submit" className="min-h-11 rounded-full border border-rule-strong px-5 text-step-n1 font-semibold">Filter</button>
        </form>
        <div className="mt-5">
          {data.rows.length ? (
            <LibraryTable rows={data.rows} canPublish={can(user.role, "post.publish")} canDelete={can(user.role, "post.delete")} />
          ) : (
            <EmptyState title={search || status ? "Nothing matches" : "No stories yet"} body={search || status ? "Try another filter or search." : "Your first story is one click away."} action={<Link href="/studio/write/new" className="font-semibold text-accent underline">Write a story</Link>} />
          )}
        </div>
        {data.pages > 1 && (
          <nav aria-label="Pages" className="mt-6 flex items-center justify-center gap-2 text-step-n1">
            {page > 1 && <Link href={qs({ page: String(page - 1) }) as never} className="share-pill">← Newer</Link>}
            <span className="px-2 text-ink-muted">Page {page} of {data.pages}</span>
            {page < data.pages && <Link href={qs({ page: String(page + 1) }) as never} className="share-pill">Older →</Link>}
          </nav>
        )}
      </StudioSection>
    </>
  );
}
