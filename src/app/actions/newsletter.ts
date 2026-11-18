"use server";

import { z } from "zod";
import { subscribe } from "@/server/newsletter";
import { rateLimit } from "@/server/security/rate-limit";
import { clientIp, looksLikeBot, verifyTurnstile } from "@/server/security/spam";
import { hashIdentifier } from "@/server/security/hash";
import { db, schema } from "@/server/db";

export type NewsletterState = { status: "idle" | "success" | "error"; message: string };

const Input = z.object({
  email: z.email({ message: "Please enter a valid email address." }).max(254),
  source: z.enum(["homepage", "article", "footer", "account", "newsletter-page"]).default("footer"),
});

export async function subscribeAction(_prev: NewsletterState, form: FormData): Promise<NewsletterState> {
  const parsed = Input.safeParse({ email: form.get("email"), source: form.get("source") ?? undefined });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Please check your email address." };
  // Bots get a cheerful success so they learn nothing.
  if (looksLikeBot(form)) return { status: "success", message: "Thank you. Please check your inbox to confirm." };
  const ip = await clientIp();
  if (!(await rateLimit(`newsletter:${hashIdentifier(ip) ?? "anon"}`, 5, 600))) {
    return { status: "error", message: "That’s a lot of sign-ups at once. Please try again in a few minutes." };
  }
  if (!(await verifyTurnstile(form.get("cf-turnstile-response") as string | null, ip))) {
    return { status: "error", message: "We couldn’t confirm you’re human. Please try again." };
  }
  const result = await subscribe(parsed.data.email, parsed.data.source, ip);
  await db.insert(schema.analyticsEvents).values({ type: "newsletter_signup", path: parsed.data.source });
  if (result === "already_subscribed") return { status: "success", message: "You’re already subscribed. Thank you for reading." };
  return { status: "success", message: "Almost there. We’ve sent you an email; tap the link inside to confirm." };
}
