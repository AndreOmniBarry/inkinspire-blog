import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3200);
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/inkinspire_test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "off", locale: "en-GB", timezoneId: "Africa/Lagos" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: { DATABASE_URL, SITE_URL: `http://localhost:${PORT}`, NODE_ENV: "production", BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "e2e-secret-e2e-secret-e2e-secret-e2e-secret", HASH_SALT: "e2e-salt-e2e-salt", CRON_SECRET: "e2e-cron-secret-0000", DANGEROUSLY_DISABLE_RATE_LIMITS: "1" },
  },
});
