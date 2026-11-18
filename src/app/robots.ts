import type { MetadataRoute } from "next";

const base = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  if (/\.vercel\.app$/.test(new URL(base).hostname)) {
    // A preview, not the real site: keep it out of search results.
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/studio", "/account", "/api/", "/search", "/login", "/register", "/reset-password", "/forgot-password", "/verify-email", "/newsletter/"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
