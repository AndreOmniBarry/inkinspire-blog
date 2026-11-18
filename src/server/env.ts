import "server-only";
import { z } from "zod";

/**
 * Every environment variable the app reads, validated once at start-up.
 * Documented for humans in .env.example. Optional integrations degrade gracefully and
 * the Studio's Settings › Integrations page shows which ones are not yet configured.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().default("postgres://postgres@127.0.0.1:5432/inkinspire"),
  SITE_URL: z.string().url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(32).default("development-only-secret-change-me-0123456789"),
  /** Salt for hashing IPs and visitor ids. */
  HASH_SALT: z.string().min(16).default("development-only-salt"),
  CRON_SECRET: z.string().min(16).optional(),

  // Media (Cloudflare R2, S3 API). When unset, media is stored on local disk (development only).
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Email (Resend). When unset, emails are written to the outbox and logged, not sent.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Inkinspire <stories@inkinspire.local>"),
  EMAIL_REPLY_TO: z.string().optional(),
  EMAIL_DAILY_LIMIT: z.coerce.number().int().positive().default(100),
  RESEND_WEBHOOK_SECRET: z.string().optional(),

  // Spam protection (Cloudflare Turnstile). When unset, honeypot + rate limits still apply.
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),

  // Payments (Paystack). Sandbox keys start with sk_test_.
  PAYSTACK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().optional(),

  // Analytics
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  GOOGLE_SITE_VERIFICATION: z.string().optional(),

  // Backups
  BACKUP_AGE_RECIPIENT: z.string().optional(),
});

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined;
const parsed = schema.safeParse({ ...process.env, SITE_URL: process.env.SITE_URL || vercelUrl || undefined });
if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error));
  throw new Error("Invalid environment variables. See .env.example.");
}

export const env = parsed.data;

if (env.NODE_ENV === "production" && env.BETTER_AUTH_SECRET.startsWith("development-only")) {
  throw new Error("BETTER_AUTH_SECRET must be set in production.");
}
