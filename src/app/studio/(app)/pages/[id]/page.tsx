import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { StudioSection } from "@/components/studio/page-header";
import { PageEditor } from "@/components/studio/page-editor";
import type { Doc } from "@/lib/editor/render";

export default async function EditPage({ params }: PageProps<"/studio/pages/[id]">) {
  await requireStaff("page.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await db.query.pages.findFirst({ where: eq(schema.pages.id, id) });
  if (!p) notFound();
  return (
    <StudioSection>
      <div className="mx-auto max-w-4xl pt-4">
        <PageEditor page={{ id: p.id, slug: p.slug, kind: p.kind, title: p.title, seoDescription: p.seoDescription, contentJson: p.contentJson as Doc, isTemplate: p.isTemplate }} />
      </div>
    </StudioSection>
  );
}
