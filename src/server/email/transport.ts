import "server-only";
import { env } from "@/server/env";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  idempotencyKey: string;
  replyTo?: string;
};

export interface EmailTransport {
  readonly name: string;
  send(email: OutgoingEmail): Promise<{ id: string }>;
}

/** Resend over its REST API (no SDK needed). Docs: https://resend.com/docs/api-reference/emails/send-email */
class ResendTransport implements EmailTransport {
  readonly name = "resend";
  constructor(private apiKey: string) {}
  async send(email: OutgoingEmail) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": email.idempotencyKey.slice(0, 256),
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        headers: email.headers,
        reply_to: email.replyTo ?? env.EMAIL_REPLY_TO,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const err = new Error(`Resend ${res.status}: ${body.slice(0, 300)}`) as Error & { permanent?: boolean };
      err.permanent = res.status === 422 || res.status === 403; // invalid recipient / unverified domain
      throw err;
    }
    const json = (await res.json()) as { id: string };
    return { id: json.id };
  }
}

/** Development/test transport: records instead of sending. Tests read `sentEmails`. */
export const sentEmails: OutgoingEmail[] = [];
class LogTransport implements EmailTransport {
  readonly name = "log";
  async send(email: OutgoingEmail) {
    sentEmails.push(email);
    if (sentEmails.length > 200) sentEmails.shift();
    if (env.NODE_ENV === "development") {
      const link = /https?:\/\/\S+?(?=["<\s])/.exec(email.text)?.[0];
      console.info(`\n✉  [email:${email.to}] ${email.subject}${link ? `\n   ${link}` : ""}\n`);
    }
    return { id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  }
}

let transport: EmailTransport | undefined;
export function getTransport(): EmailTransport {
  transport ??= env.RESEND_API_KEY ? new ResendTransport(env.RESEND_API_KEY) : new LogTransport();
  return transport;
}
