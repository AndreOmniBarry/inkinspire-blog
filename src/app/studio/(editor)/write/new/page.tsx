import { createStory } from "@/app/studio/actions/posts";
import { requireStaff } from "@/server/auth/session";
import { connection } from "next/server";

/** Visiting /studio/write/new starts a fresh draft and opens it. */
export default async function NewStory() {
  await connection();
  await requireStaff("post.create");
  await createStory();
  return null;
}
