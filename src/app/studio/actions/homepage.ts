"use server";

import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { assertPermission } from "@/server/auth/session";
import { audit } from "@/server/audit";

const Slots = z.array(
  z.object({
    id: z.uuid(),
    enabled: z.boolean(),
    heading: z.string().trim().max(80).nullable(),
    postIds: z.array(z.uuid()).max(6),
  }),
).max(20);

export async function saveHomepage(input: z.input<typeof Slots>) {
  const user = await assertPermission("homepage.manage");
  const slots = Slots.parse(input);
  await db.transaction(async (tx) => {
    for (const [position, s] of slots.entries()) {
      await tx.update(schema.homepageSlots).set({ position, enabled: s.enabled, heading: s.heading || null, postIds: s.postIds }).where(eq(schema.homepageSlots.id, s.id));
    }
  });
  await audit(user, "homepage.update", "Updated the homepage layout");
  updateTag("homepage");
  return { ok: true };
}
