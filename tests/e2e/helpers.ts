import { createOTP } from "@better-auth/utils/otp";
import { expect, type Page } from "@playwright/test";

export const TEST_PASSWORD = "Quiet-river-at-dawn-42";
export const TEST_TOTP_SECRET = "inkinspire-test-totp-secret-0001";
export const CANARY = "CANARY-7f3a9c1e-protected-text";

export async function totp() {
  return createOTP(TEST_TOTP_SECRET, { digits: 6, period: 30 }).totp();
}

/** Signs in through the real UI, including two-step verification for staff. */
export async function signIn(page: Page, email: string, opts: { twoFactor?: boolean } = {}) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  if (opts.twoFactor ?? (!email.startsWith("reader") && !email.startsWith("member") && !email.startsWith("expired"))) {
    await page.getByLabel("6-digit code").fill(await totp());
    await page.getByRole("button", { name: "Verify and sign in" }).click();
  }
  // The app redirects (and refreshes) after sign-in; wait for it to settle away from /login.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
  await page.waitForLoadState("networkidle").catch(() => {});
}

export const roleEmail = (role: string) => `${role}@test.inkinspire.local`;
