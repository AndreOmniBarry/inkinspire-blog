import { redirect } from "next/navigation";
import { unsubscribe } from "@/server/newsletter";

/** RFC 8058 one-click unsubscribe: mail clients POST here from the List-Unsubscribe header. */
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  await unsubscribe(token);
  return new Response(null, { status: 200 });
}

/** A person clicking the link lands on the confirmation page (GETs never unsubscribe: link scanners would). */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  redirect(`/newsletter/unsubscribe?token=${encodeURIComponent(token)}`);
}
