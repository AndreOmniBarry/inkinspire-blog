"use server";

import { z } from "zod";
import { db, schema } from "@/server/db";
import { enqueueEmail, PRIORITY } from "@/server/email/outbox";
import { env } from "@/server/env";
import { getSiteSettings } from "@/server/settings";
import { hashIdentifier } from "@/server/security/hash";
import { rateLimit } from "@/server/security/rate-limit";
import { clientIp, looksLikeBot, verifyTurnstile } from "@/server/security/spam";

export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "topic" | "message", string>>;
  values?: Record<string, string>;
};

const topics = ["general", "collaboration", "partnership", "press", "support"] as const;
const Input = z.object({
  name: z.string().trim().min(2, "Please tell us your name.").max(120),
  email: z.email("Please enter a valid email address.").max(254),
  topic: z.enum(topics, { message: "Please choose a topic." }),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10, "Please write a little more (at least 10 characters).").max(5000, "Please keep it under 5,000 characters."),
});

export async function sendContactMessage(_prev: ContactState, form: FormData): Promise<ContactState> {
  const values = Object.fromEntries(["name", "email", "topic", "subject", "message"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = Input.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: ContactState["fieldErrors"] = {};
    for (const i of parsed.error.issues) fieldErrors[i.path[0] as keyof typeof fieldErrors] ??= i.message;
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors, values };
  }
  if (looksLikeBot(form)) return { status: "success" };
  const ip = await clientIp();
  if (!(await rateLimit(`contact:${hashIdentifier(ip) ?? "anon"}`, 4, 3600))) {
    return { status: "error", message: "You’ve sent several messages in a short time. Please try again in an hour.", values };
  }
  if (!(await verifyTurnstile(form.get("cf-turnstile-response") as string | null, ip))) {
    return { status: "error", message: "We couldn’t confirm you’re human. Please try again.", values };
  }
  const d = parsed.data;
  const [row] = await db
    .insert(schema.contactMessages)
    .values({ name: d.name, email: d.email.toLowerCase(), topic: d.topic, subject: d.subject || null, message: d.message, ipHash: hashIdentifier(ip) })
    .returning({ id: schema.contactMessages.id });
  const settings = await getSiteSettings();
  await enqueueEmail({
    to: settings.identity.contactEmail,
    template: "contact_notification",
    payload: { name: d.name, email: d.email, topic: d.topic, subject: d.subject, message: d.message, inboxUrl: `${env.SITE_URL}/studio/inbox` },
    idempotencyKey: `contact-owner:${row.id}`,
    priority: PRIORITY.notification,
  });
  await enqueueEmail({
    to: d.email,
    template: "contact_acknowledgement",
    payload: { name: d.name },
    idempotencyKey: `contact-ack:${row.id}`,
    priority: PRIORITY.notification,
  });
  return { status: "success" };
}
