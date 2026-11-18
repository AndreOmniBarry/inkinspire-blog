import { z } from "zod";
import { db, schema } from "@/server/db";
import { hashIdentifier } from "@/server/security/hash";

const Body = z.object({ analytics: z.boolean() });

/** Records cookie-consent choices (accountability under NDPA 2023 / GDPR). */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  await db.insert(schema.consentLog).values({
    kind: "cookies",
    granted: { essential: true, analytics: parsed.data.analytics },
    source: "banner",
    ipHash: hashIdentifier(ip),
  });
  return new Response(null, { status: 204 });
}
