/**
 * Runs on every deploy (see `vercel-build`). If OWNER_EMAIL is set and no owner exists yet, creates the
 * owner account with a one-time password printed ONCE in the build log (visible only to the people who
 * can see the Vercel project). The owner must change it and set up two-step verification on first sign-in.
 * Does nothing once an owner exists.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../src/server/db";
import { hashPassword } from "../src/server/security/hash";

const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
const name = process.env.OWNER_NAME?.trim() || "Sylvia Simon";
if (!email) {
  console.log("OWNER_EMAIL not set; skipping owner account.");
  process.exit(0);
}
const existingOwner = await db.query.users.findFirst({ where: eq(schema.users.role, "owner") });
if (existingOwner) {
  console.log("Owner account already exists; nothing to do.");
  process.exit(0);
}
const taken = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${email}` });
if (taken) {
  console.error(`${email} already has an account; not changing it.`);
  process.exit(0);
}
const password = randomBytes(12).toString("base64url");
const [user] = await db.insert(schema.users).values({ name, email, emailVerified: true, role: "owner", mustChangePassword: true }).returning();
await db.insert(schema.accounts).values({ accountId: user.id, providerId: "credential", userId: user.id, password: await hashPassword(password) });
const author = await db.query.authors.findFirst({ where: eq(schema.authors.slug, "xenia") });
if (author && !author.userId) await db.update(schema.authors).set({ userId: user.id }).where(eq(schema.authors.id, author.id));
console.log(`\n================ INKINSPIRE OWNER ACCOUNT ================\nEmail:              ${email}\nOne-time password:  ${password}\nSign in at /login. You'll choose your own password and set up\ntwo-step verification straight away. Shown only once.\n==========================================================\n`);
process.exit(0);
