import { getStorage, r2Configured } from "@/server/media/storage";

/** Development-only media server (production serves files from R2 directly). */
export async function GET(_req: Request, ctx: RouteContext<"/media/[...key]">) {
  if (r2Configured()) return new Response("Not found", { status: 404 });
  const { key } = await ctx.params;
  const k = key.join("/");
  if (!/^media\/[\w/.-]+\.(webp|avif)$/.test(k)) return new Response("Not found", { status: 404 });
  try {
    const body = await getStorage().read!(k);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": k.endsWith(".avif") ? "image/avif" : "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
