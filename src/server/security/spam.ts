import "server-only";
import { headers } from "next/headers";
import { env } from "@/server/env";

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

/**
 * Cloudflare Turnstile server-side verification. When no secret is configured (development, or
 * before the owner adds keys) we fall back to honeypot + timing + rate limits, which still stop
 * the vast majority of bots. Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstile(token: string | null | undefined, ip: string | null): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const json = (await res.json()) as { success: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}

/** Honeypot: a visually hidden field humans never fill. Timing: forms submitted in < 2 s are bots. */
export function looksLikeBot(form: FormData): boolean {
  if (String(form.get("website") ?? "").trim() !== "") return true;
  const started = Number(form.get("_t") ?? 0);
  if (started && Date.now() - started < 2000) return true;
  return false;
}
