import { notFound } from "next/navigation";
import { StoryEditor } from "@/components/editor/editor";
import { requireStaff } from "@/server/auth/session";
import { loadEditor } from "@/server/studio/editor-data";

export default async function WritePage({ params }: PageProps<"/studio/write/[id]">) {
  const user = await requireStaff("post.create");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await loadEditor(user, id);
  if (!data) notFound();
  return <StoryEditor key={data.post.updatedAt} post={data.post} options={data.options} />;
}
