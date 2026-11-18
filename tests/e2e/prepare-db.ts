/**
 * Prepares a fresh end-to-end database BEFORE Playwright starts the server:
 * reset → migrate → seed demo content → role fixtures and the premium canary story.
 * Run via `pnpm test:e2e` (never against a real database: it refuses production).
 */
import { execSync } from "node:child_process";

const env = {
  ...process.env,
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/inkinspire_test",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "e2e-secret-e2e-secret-e2e-secret-e2e-secret",
  HASH_SALT: "e2e-salt-e2e-salt",
  NODE_ENV: "development" as const,
};
const run = (cmd: string) => execSync(cmd, { stdio: "inherit", env });
run("pnpm -s tsx --conditions=react-server scripts/reset-db.ts");
run("pnpm -s tsx --conditions=react-server scripts/migrate.ts");
run("pnpm -s tsx --conditions=react-server scripts/seed.ts --no-owner");
run("pnpm -s tsx --conditions=react-server scripts/test-users.ts");
