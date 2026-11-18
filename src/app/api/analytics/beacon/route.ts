import { z } from "zod";
import { db, schema } from "@/server/db";
import { hashIdentifier } from "@/server/security/hash";
import { rateLimit } from "@/server/security/rate-limit";

const Body = z.object({
  type: z.enum(["view", "read_complete", "share", "search"]),
  postId: z.uuid().optional(),
  path: z.string().max(300).optional(),
  ref: z.string().max(500).optional(),
  scrollDepth: z.number().int().min(0).max(100).optional(),
  seconds: z.number().int().min(0).max(86400).optional(),
  query: z.string().max(120).optional(),
});

function device(ua: string): string {
  if (/iPad|Tablet|Nexus 7|SM-T/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

/**
 * First-party, cookie-free analytics (works when readers decline GA4). The visitor id is a hash of
 * IP + user agent + today's date: it lets us count unique readers per day, rotates daily, and cannot
 * be reversed. Bots are ignored.
 */
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  if (/bot|crawl|spider|slurp|headless|lighthouse/i.test(ua)) return new Response(null, { status: 204 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const visitorHash = hashIdentifier(`${ip}|${ua}|${new Date().toISOString().slice(0, 10)}`);
  if (!(await rateLimit(`beacon:${visitorHash}`, 120, 3600))) return new Response(null, { status: 204 });
  const d = parsed.data;
  let referrerHost: string | null = null;
  try {
    referrerHost = d.ref ? new URL(d.ref).hostname.replace(/^www\./, "") : null;
    if (referrerHost && req.headers.get("host")?.includes(referrerHost)) referrerHost = null;
  } catch {
    referrerHost = null;
  }
  await db.insert(schema.analyticsEvents).values({
    type: d.type,
    postId: d.postId,
    path: d.path,
    referrerHost,
    device: device(ua),
    country: req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry"),
    scrollDepth: d.scrollDepth,
    seconds: d.seconds,
    query: d.query,
    visitorHash,
  });
  return new Response(null, { status: 204 });
}
