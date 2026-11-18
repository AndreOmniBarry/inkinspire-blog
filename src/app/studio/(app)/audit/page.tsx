import Link from "next/link";
import { desc, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { StudioHeader, StudioSection } from "@/components/studio/page-header";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Activity log" };
const PAGE = 50;

export default async function AuditPage({ searchParams }: PageProps<"/studio/audit">) {
  await requireStaff("audit.view");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const where = q ? or(ilike(schema.auditLog.summary, `%${q}%`), ilike(schema.auditLog.actorLabel, `%${q}%`), ilike(schema.auditLog.action, `%${q}%`)) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db.select().from(schema.auditLog).where(where).orderBy(desc(schema.auditLog.createdAt)).limit(PAGE).offset((page - 1) * PAGE),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.auditLog).where(where),
  ]);
  return (
    <>
      <StudioHeader title="Activity log" description="Every important change: who did it, and when (Lagos time). Entries can’t be edited or deleted." />
      <StudioSection>
        <form className="mb-4 flex gap-2" action="/studio/audit">
          <label htmlFor="aq" className="sr-only">Search the log</label>
          <input id="aq" name="q" defaultValue={q} placeholder="Search by person or action…" className="field max-w-md" />
          <button type="submit" className="min-h-11 rounded-full border border-rule-strong px-5 text-step-n1 font-semibold">Search</button>
        </form>
        <ol className="divide-y divide-rule overflow-hidden rounded-[var(--radius-l)] border border-rule bg-surface">
          {rows.map((r) => (
            <li key={r.id} className="grid gap-1 px-4 py-3 md:grid-cols-[11rem_1fr_14rem] md:items-baseline md:gap-4">
              <time className="text-step-n2 text-ink-muted tabular-nums" dateTime={r.createdAt.toISOString()}>{formatDateTime(r.createdAt)}</time>
              <p className="text-step-n1">{r.summary}</p>
              <p className="truncate text-step-n2 text-ink-soft md:text-right">{r.actorLabel}</p>
            </li>
          ))}
          {!rows.length && <li className="px-4 py-6 text-step-n1 text-ink-soft">Nothing found.</li>}
        </ol>
        <nav aria-label="Pages" className="mt-4 flex items-center justify-center gap-2 text-step-n1">
          {page > 1 && <Link className="share-pill" href={`/studio/audit?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}>← Newer</Link>}
          <span className="text-ink-muted">{n.toLocaleString("en-GB")} entries</span>
          {page * PAGE < n && <Link className="share-pill" href={`/studio/audit?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}>Older →</Link>}
        </nav>
      </StudioSection>
    </>
  );
}
