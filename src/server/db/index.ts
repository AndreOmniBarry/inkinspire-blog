import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/server/env";

/**
 * One pooled client per server instance. On serverless hosts each instance keeps a small pool;
 * Neon's pooled connection string (…-pooler…) should be used in production.
 */
const globalForDb = globalThis as unknown as { __inkSql?: postgres.Sql };

const client =
  globalForDb.__inkSql ??
  postgres(env.DATABASE_URL, {
    max: env.NODE_ENV === "production" ? 5 : 10,
    idle_timeout: 20,
    prepare: false, // compatible with PgBouncer / Neon pooler
  });
if (env.NODE_ENV !== "production") globalForDb.__inkSql = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type DB = typeof db;
export { schema };
