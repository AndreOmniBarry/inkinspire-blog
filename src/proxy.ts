import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/server/auth/auth";
import { can, isStaff, type Role } from "@/server/auth/permissions";
import { permissionFor } from "@/server/auth/studio-routes";
import { publicRouteExists } from "@/server/route-index";

const PUBLIC_DYNAMIC = /^\/(stories|category|tags|collections|authors|legal)\/([^/]+)\/?$/;

/**
 * Studio gatekeeper, before any rendering starts: signed-out visitors go to sign-in, people without
 * the right role get a real 403. (Every page and action checks again on the server: defence in depth.)
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const pub = PUBLIC_DYNAMIC.exec(pathname);
  if (pub) {
    // Real 404s for unknown addresses (no "soft 404" from a streamed shell).
    const ok = await publicRouteExists(`${pub[1]}/${decodeURIComponent(pub[2])}`).catch(() => true);
    if (ok) return NextResponse.next();
    return NextResponse.rewrite(new URL("/__not-found", req.url), { status: 404 });
  }
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  const u = session.user as { role?: Role; status?: string; twoFactorEnabled?: boolean | null; mustChangePassword?: boolean };
  const role = (u.role ?? "reader") as Role;
  if (u.status === "suspended" || !isStaff(role)) return forbidden();
  const setupNeeded = u.mustChangePassword || !u.twoFactorEnabled;
  if (setupNeeded && !pathname.startsWith("/studio/welcome")) {
    const url = req.nextUrl.clone();
    url.pathname = "/studio/welcome";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (!can(role, permissionFor(pathname))) return forbidden();
  return NextResponse.next();
}

function forbidden() {
  return new NextResponse(
    `<!doctype html><html lang="en-GB"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not available · Inkinspire Studio</title><body style="font-family:Georgia,serif;background:#FAF6EF;color:#1B1A17;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px"><div><h1 style="font-weight:400">This part of the Studio isn’t available to you.</h1><p style="color:#4A463F">If you think you should have access, ask the publication’s owner.</p><p><a href="/studio" style="color:#7A1F2B">Back to the Studio</a></p></div></body></html>`,
    { status: 403, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

export const config = {
  matcher: ["/studio/:path*", "/stories/:slug", "/category/:slug", "/tags/:slug", "/collections/:slug", "/authors/:slug", "/legal/:slug"],
};
