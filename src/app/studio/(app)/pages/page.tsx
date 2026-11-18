import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { StudioHeader, StudioSection } from "@/components/studio/page-header";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Pages" };

export default async function PagesList() {
  await requireStaff("page.manage");
  const rows = await db.select().from(schema.pages).orderBy(asc(schema.pages.kind), asc(schema.pages.title));
  return (
    <>
      <StudioHeader title="Pages" description="Your About page and the policies every publication needs." />
      <StudioSection>
        <ul className="divide-y divide-rule overflow-hidden rounded-[var(--radius-l)] border border-rule bg-surface">
          {rows.map((p) => (
            <li key={p.id}>
              <Link href={`/studio/pages/${p.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-sunken">
                <span className="flex-1 font-semibold">{p.title}</span>
                {p.isTemplate && <span className="rounded-full bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] px-2.5 py-0.5 text-step-n2 font-semibold text-warning">Template: needs legal review</span>}
                <span className="text-step-n2 text-ink-muted">Updated {formatDateTime(p.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </StudioSection>
    </>
  );
}
