/** `pnpm db:reset` (development only): drops every table, then migrate + seed run again. */
import "dotenv/config";
import postgres from "postgres";

if (process.env.NODE_ENV === "production") throw new Error("Refusing to reset a production database.");
const sql = postgres(process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/inkinspire", { max: 1, onnotice: () => {} });
await sql`drop schema if exists public cascade`;
await sql`drop schema if exists drizzle cascade`;
await sql`create schema public`;
await sql.end();
console.log("Database emptied.");
