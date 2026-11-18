/**
 * Test fixtures (never run in production): one user per role with a known password and two-step
 * verification already enrolled with a known secret, so end-to-end tests can sign in as anyone.
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { symmetricEncrypt } from "better-auth/crypto";
import { db, schema } from "../src/server/db";
import { hashPassword } from "../src/server/security/hash";

if (process.env.NODE_ENV === "production") throw new Error("Refusing to create test users in production.");

export const TEST_PASSWORD = "Quiet-river-at-dawn-42";
export const TEST_TOTP_SECRET = "inkinspire-test-totp-secret-0001";
export const CANARY = "CANARY-7f3a9c1e-protected-text";
const roles = ["owner", "admin", "editor", "author", "moderator", "reader"] as const;

async function main() {
  const secret = process.env.BETTER_AUTH_SECRET!;
  const encSecret = await symmetricEncrypt({ key: secret, data: TEST_TOTP_SECRET });
  const encCodes = await symmetricEncrypt({ key: secret, data: JSON.stringify(["test-code-01", "test-code-02"]) });
  const hash = await hashPassword(TEST_PASSWORD);
  for (const role of roles) {
    const email = `${role}@test.inkinspire.local`;
    let user = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${email}` });
    if (!user) {
      [user] = await db.insert(schema.users).values({ name: `Test ${role[0].toUpperCase()}${role.slice(1)}`, email, emailVerified: true, role, twoFactorEnabled: role !== "reader" }).returning();
      await db.insert(schema.accounts).values({ accountId: user.id, providerId: "credential", userId: user.id, password: hash });
      if (role !== "reader") await db.insert(schema.twoFactors).values({ userId: user.id, secret: encSecret, backupCodes: encCodes, verified: true });
    }
    if (role === "author") {
      const a = await db.query.authors.findFirst({ where: eq(schema.authors.slug, "test-author") });
      if (!a) await db.insert(schema.authors).values({ slug: "test-author", name: "Test Author", userId: user.id });
    }
  }
  // Readers with membership history, for the premium canary test.
  for (const [email, ends] of [["member@test.inkinspire.local", new Date(Date.now() + 30 * 864e5)], ["expired@test.inkinspire.local", new Date(Date.now() - 864e5)]] as const) {
    let u = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${email}` });
    if (!u) {
      [u] = await db.insert(schema.users).values({ name: email.split("@")[0], email, emailVerified: true, role: "reader" }).returning();
      await db.insert(schema.accounts).values({ accountId: u.id, providerId: "credential", userId: u.id, password: hash });
      await db.insert(schema.entitlements).values({ userId: u.id, source: "complimentary", startsAt: new Date(Date.now() - 60 * 864e5), endsAt: ends, reason: "test fixture" });
    }
  }
  // A premium story whose protected part contains a unique canary string.
  const canarySlug = "canary-premium-story";
  if (!(await db.query.posts.findFirst({ where: eq(schema.posts.slug, canarySlug) }))) {
    const { deriveContent } = await import("../src/server/content/derive");
    const doc = {
      type: "doc" as const,
      content: [
        { type: "paragraph", content: [{ type: "text", text: "PUBLIC-PREVIEW-MARKER: this opening is free for everyone to read." }] },
        { type: "paywall" },
        { type: "paragraph", content: [{ type: "text", text: `The protected part says ${CANARY} and must never leak.` }] },
      ],
    };
    const d = await deriveContent(doc, "premium");
    const cat = await db.query.categories.findFirst();
    const [post] = await db
      .insert(schema.posts)
      .values({ slug: canarySlug, title: "Canary premium story", excerpt: "A test story.", status: "published", visibility: "premium", contentJson: doc, ...d, categoryId: cat?.id, publishedAt: new Date(Date.now() - 3600_000) })
      .returning();
    const author = await db.query.authors.findFirst();
    if (author) await db.insert(schema.postAuthors).values({ postId: post.id, authorId: author.id });
  }
  console.log("Test users ready.");
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
