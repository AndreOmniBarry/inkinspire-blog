import type { MetadataRoute } from "next";

const base = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/studio", "/account", "/api/", "/search", "/login", "/register", "/reset-password", "/forgot-password", "/verify-email", "/newsletter/"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
