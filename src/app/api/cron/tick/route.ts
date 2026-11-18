import { env } from "@/server/env";
import { runTick } from "@/server/jobs";
import { safeEqual } from "@/server/security/hash";

/**
 * Called every minute by a free scheduler (cron-job.org) and hourly by GitHub Actions as a backup.
 * Protected by CRON_SECRET in the Authorization header (Vercel Cron sends it the same way).
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!env.CRON_SECRET || !safeEqual(auth, `Bearer ${env.CRON_SECRET}`)) return new Response("Unauthorized", { status: 401 });
  const result = await runTick();
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
export const POST = GET;
