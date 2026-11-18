import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { haveIBeenPwned } from "better-auth/plugins/haveibeenpwned";
import { twoFactor } from "better-auth/plugins/two-factor";
import { and, eq, gte, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db, schema } from "@/server/db";
import { enqueueEmail, PRIORITY } from "@/server/email/outbox";
import { env } from "@/server/env";
import { hashIdentifier, hashPassword, verifyPassword } from "@/server/security/hash";
import { passwordProblem } from "@/lib/password-policy";

const LOCKOUT_FAILURES = 8;
const LOCKOUT_WINDOW_MIN = 15;

/**
 * Authentication (Better Auth): email + password, mandatory email verification, password reset,
 * TOTP two-step verification with recovery codes, breached-password check, rate limits, account lockout.
 * Social login is behind the `social_login` feature flag and off by default.
 */
export const auth = betterAuth({
  appName: "Inkinspire",
  baseURL: env.SITE_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      twoFactor: schema.twoFactors,
      rateLimit: schema.rateLimits,
    },
  }),
  advanced: {
    database: { generateId: () => uuidv7() },
    useSecureCookies: env.NODE_ENV === "production",
    cookiePrefix: "ink",
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: env.NODE_ENV === "production" },
  },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "reader", input: false },
      status: { type: "string", required: false, defaultValue: "active", input: false },
      mustChangePassword: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days for readers; Studio re-checks 2FA status on every request
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false }, // always read from the database, so suspensions apply immediately
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    password: { hash: hashPassword, verify: verifyPassword },
    sendResetPassword: async ({ user, url, token }) => {
      await enqueueEmail({
        to: user.email,
        template: "reset_password",
        payload: { name: user.name, url },
        idempotencyKey: `reset:${user.id}:${token.slice(0, 16)}`,
        priority: PRIORITY.critical,
      });
      await kickOutbox();
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url, token }) => {
      await enqueueEmail({
        to: user.email,
        template: "verify_email",
        payload: { name: user.name, url },
        idempotencyKey: `verify:${user.id}:${token.slice(-16)}`,
        priority: PRIORITY.critical,
      });
      await kickOutbox();
    },
    afterEmailVerification: async (user) => {
      await enqueueEmail({
        to: user.email,
        template: "welcome",
        payload: { name: user.name },
        idempotencyKey: `welcome:${user.id}`,
        priority: PRIORITY.notification,
      });
    },
  },
  rateLimit: {
    enabled: env.NODE_ENV !== "test",
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60 * 10, max: 5 },
      "/request-password-reset": { window: 60 * 10, max: 3 },
      "/send-verification-email": { window: 60 * 10, max: 3 },
      "/two-factor/verify-totp": { window: 60, max: 5 },
      "/two-factor/verify-backup-code": { window: 60, max: 5 },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Never store raw IP addresses (privacy by design, NDPA 2023).
        before: async (session) => ({ data: { ...session, ipAddress: hashIdentifier(session.ipAddress) } }),
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email" || ctx.path === "/reset-password" || ctx.path === "/change-password") {
        const body = ctx.body as { password?: string; newPassword?: string } | undefined;
        const pw = body?.newPassword ?? body?.password;
        const problem = pw ? passwordProblem(pw) : null;
        if (problem) throw new APIError("BAD_REQUEST", { message: problem });
      }
      if (ctx.path === "/sign-in/email") {
        const email = String((ctx.body as { email?: string })?.email ?? "").toLowerCase();
        const user = email ? await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${email}` }) : null;
        if (user) {
          if (user.status === "suspended" || user.deletedAt) {
            // Same message as a wrong password: no account enumeration.
            throw new APIError("UNAUTHORIZED", { message: "Invalid email or password" });
          }
          const since = new Date(Date.now() - LOCKOUT_WINDOW_MIN * 60_000);
          const [row] = await db
            .select({ n: sql<number>`count(*)::int` })
            .from(schema.loginEvents)
            .where(and(eq(schema.loginEvents.userId, user.id), eq(schema.loginEvents.event, "sign_in_failed"), gte(schema.loginEvents.createdAt, since)));
          if ((row?.n ?? 0) >= LOCKOUT_FAILURES) {
            throw new APIError("TOO_MANY_REQUESTS", {
              message: `Too many attempts. For your security, please wait ${LOCKOUT_WINDOW_MIN} minutes or reset your password.`,
            });
          }
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;
      const email = String((ctx.body as { email?: string })?.email ?? "").toLowerCase();
      if (!email) return;
      const user = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${email}` });
      if (!user) return;
      const returned = ctx.context.returned;
      const failed = returned instanceof Error || (returned instanceof Response && !returned.ok);
      const ip = ctx.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      await db.insert(schema.loginEvents).values({
        userId: user.id,
        event: failed ? "sign_in_failed" : "sign_in",
        ipHash: hashIdentifier(ip),
        userAgent: ctx.request?.headers.get("user-agent")?.slice(0, 200),
      });
    }),
  },
  plugins: [
    twoFactor({
      issuer: "Inkinspire",
      backupCodeOptions: { amount: 10, length: 10 },
    }),
    haveIBeenPwned({
      customPasswordCompromisedMessage:
        "This password has appeared in a known data breach. Please choose a different one; a short sentence works well.",
      enabled: env.NODE_ENV === "production",
    }),
    nextCookies(), // must be last
  ],
});

export type Session = typeof auth.$Infer.Session;

/** Send critical mail straight away rather than waiting for the next minute's job. */
async function kickOutbox() {
  try {
    const { drainOutbox } = await import("@/server/email/outbox");
    await drainOutbox(5);
  } catch (e) {
    console.error("Outbox kick failed (will retry on schedule):", e);
  }
}
