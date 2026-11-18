"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { assertPermission } from "@/server/auth/session";

export async function markMessage(id: string, patch: "read" | "unread" | "archive") {
  await assertPermission("reader.view");
  const set = patch === "read" ? { readAt: new Date() } : patch === "unread" ? { readAt: null } : { archivedAt: new Date() };
  await db.update(schema.contactMessages).set(set).where(eq(schema.contactMessages.id, z.uuid().parse(id)));
}
