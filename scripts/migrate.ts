/** `pnpm db:migrate`: applies versioned SQL migrations from ./drizzle (safe to run on every deploy). */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

if (process.env.VERCEL && !process.env.DATABASE_URL) {
  console.error(
    "\n✖ No database connected yet.\n  In Vercel: open this project → Storage → Create Database → Neon (free) → connect it to the project,\n  add BETTER_AUTH_SECRET, HASH_SALT and OWNER_EMAIL under Settings → Environment Variables, then Redeploy.\n",
  );
  process.exit(1);
}
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/inkinspire";
const client = postgres(url, { max: 1, onnotice: () => {} });
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
await client.end();
console.log("Migrations applied.");
