import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// On Vercel, use the project's own address until a custom domain is set as SITE_URL.
if (!process.env.SITE_URL && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  process.env.SITE_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
}
/** Preview deployments on *.vercel.app must never be indexed by search engines. */
const isPreviewHost = /\.vercel\.app$/.test(new URL(process.env.SITE_URL ?? "http://localhost:3000").hostname);
const mediaOrigin = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).origin : "";

/**
 * Content Security Policy (ADR-007). Nonce-based CSP would force every page to render per request,
 * losing static shells and CDN caching, so we use a strict allowlist instead; all user-provided
 * HTML is sanitised on the server, and session cookies are HttpOnly.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://www.googletagmanager.com https://js.paystack.co`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${mediaOrigin} https://www.google-analytics.com https://www.googletagmanager.com`.trim(),
  "font-src 'self'",
  `connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://api.paystack.co${isDev ? " ws:" : ""}`,
  "frame-src https://challenges.cloudflare.com https://checkout.paystack.com https://js.paystack.co",
  "media-src 'self' " + mediaOrigin,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.paystack.com",
  "frame-ancestors 'self'", // the Studio previews the homepage in a same-site frame
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://checkout.paystack.com\"), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@node-rs/argon2", "sharp"],
  experimental: {
    authInterrupts: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 2048],
    remotePatterns: mediaOrigin ? [new URL(`${mediaOrigin}/**`)] : [],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  env: { SITE_URL: process.env.SITE_URL ?? "http://localhost:3000" },
  async headers() {
    return [
      { source: "/:path*", headers: isPreviewHost ? [...securityHeaders, { key: "X-Robots-Tag", value: "noindex, nofollow" }] : securityHeaders },
      { source: "/studio/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/account/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
