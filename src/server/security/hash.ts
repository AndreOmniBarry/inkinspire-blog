import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import { env } from "@/server/env";

/**
 * Argon2id parameters: OWASP's recommended minimum (m=19 MiB, t=2, p=1) raised to m=46 MiB, t=1,
 * which costs ~50 ms on a serverless CPU: slow for attackers, unnoticeable for people.
 */
const ARGON2 = { algorithm: 2 /* Argon2id */, memoryCost: 47104, timeCost: 1, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return argonHash(password, ARGON2);
}

export async function verifyPassword(data: { hash: string; password: string }): Promise<boolean> {
  try {
    return await argonVerify(data.hash, data.password);
  } catch {
    return false;
  }
}

/** Salted, one-way hash for IP addresses and other identifiers we must never store raw. */
export function hashIdentifier(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHmac("sha256", env.HASH_SALT).update(value).digest("hex").slice(0, 32);
}

/** A random URL-safe token and its SHA-256 hash (store the hash, send the token). */
export function createToken(bytes = 32): { token: string; hash: string } {
  const token = randomBytes(bytes).toString("base64url");
  return { token, hash: sha256(token) };
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
