/**
 * `pnpm owner:create --email you@example.com --name "Sylvia Simon"`
 * Creates the owner account for production with a one-time password, printed once.
 * On first sign-in the owner must choose a new password and turn on two-step verification.
 * No default passwords exist anywhere in Inkinspire.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../src/server/db";
import { hashPassword } from "../src/server/security/hash";

const arg = (k: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const email = arg("email")?.toLowerCase();
const name = arg("name") ?? "Sylvia Simon";
if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error('Usage: pnpm owner:create --email you@example.com --name "Your Name"');
  process.exit(1);
}
const existing = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${email}` });
if (existing) {
  console.error("An account with that email already exists.");
  process.exit(1);
}
const password = randomBytes(12).toString("base64url");
const [user] = await db.insert(schema.users).values({ name, email, emailVerified: true, role: "owner", mustChangePassword: true }).returning();
await db.insert(schema.accounts).values({ accountId: user.id, providerId: "credential", userId: user.id, password: await hashPassword(password) });
const author = await db.query.authors.findFirst({ where: eq(schema.authors.slug, "xenia") });
if (author && !author.userId) await db.update(schema.authors).set({ userId: user.id }).where(eq(schema.authors.id, author.id));
console.log(`\nOwner account created for ${email}.\nOne-time password: ${password}\n\nSign in at /login. You will be asked to choose your own password and set up two-step verification.\nThis password is shown only once.\n`);
process.exit(0);
