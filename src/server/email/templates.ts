import { emailLayout, toPlainText, type EmailButton } from "./layout";

/**
 * Every email the platform sends. Payloads are stored in the outbox, so templates must be pure
 * functions of their payload. Owner-editable wording lives in `email_templates` (Phase 2 editor).
 */
export type TemplatePayloads = {
  verify_email: { name: string; url: string };
  reset_password: { name: string; url: string };
  welcome: { name: string };
  contact_notification: { name: string; email: string; topic: string; subject?: string; message: string; inboxUrl: string };
  contact_acknowledgement: { name: string };
  staff_invite: { name: string; url: string; role: string };
  newsletter_confirm: { url: string; unsubscribeUrl?: string };
  newsletter_welcome: { unsubscribeUrl: string };
};
export type TemplateKey = keyof TemplatePayloads;

type Rendered = { subject: string; html: string; text: string };

type Ctx = { siteUrl: string; footerHtml?: string };

function build(
  ctx: Ctx,
  subject: string,
  preheader: string,
  heading: string,
  paragraphs: string[],
  button?: EmailButton,
  after?: string[],
): Rendered {
  return {
    subject,
    html: emailLayout({ preheader, heading, paragraphs, button, after, siteUrl: ctx.siteUrl, footerHtml: ctx.footerHtml }),
    text: toPlainText({ heading, paragraphs, button, after }),
  };
}

const first = (name: string) => name.trim().split(/\s+/)[0] || "there";

export function renderTemplate<K extends TemplateKey>(key: K, payload: TemplatePayloads[K], ctx: Ctx): Rendered {
  switch (key) {
    case "verify_email": {
      const p = payload as TemplatePayloads["verify_email"];
      return build(
        ctx,
        "Confirm your email for Inkinspire",
        "One tap to confirm it’s you.",
        `Welcome, ${first(p.name)}.`,
        ["Please confirm your email address so we know it’s really you. The link works for one hour."],
        { label: "Confirm my email", url: p.url },
        ["If you didn’t create an Inkinspire account, you can ignore this email; nothing will happen."],
      );
    }
    case "reset_password": {
      const p = payload as TemplatePayloads["reset_password"];
      return build(
        ctx,
        "Reset your Inkinspire password",
        "A link to choose a new password.",
        "Choose a new password",
        [`Hello ${first(p.name)}, someone (hopefully you) asked to reset the password for this account. The link works once, for one hour.`],
        { label: "Choose a new password", url: p.url },
        ["If you didn’t ask for this, ignore this email. Your password stays the same."],
      );
    }
    case "welcome": {
      const p = payload as TemplatePayloads["welcome"];
      return build(
        ctx,
        "Welcome to Inkinspire",
        "Your reading room is ready.",
        `Your reading room is ready, ${first(p.name)}.`,
        [
          "Thank you for joining Inkinspire. You can now save stories to read later, pick up where you left off, and set the page the way you like to read it.",
          "Take your time. Good stories wait.",
        ],
        { label: "Start reading", url: `${ctx.siteUrl}/stories` },
      );
    }
    case "contact_notification": {
      const p = payload as TemplatePayloads["contact_notification"];
      return build(
        ctx,
        `New message: ${p.subject || p.topic} (from ${p.name})`,
        p.message.slice(0, 90),
        "A new message from your contact page",
        [`From: ${p.name} <${p.email}>`, `Topic: ${p.topic}`, ...(p.subject ? [`Subject: ${p.subject}`] : []), p.message],
        { label: "Open in Studio", url: p.inboxUrl },
        ["Reply directly to this email to answer them."],
      );
    }
    case "contact_acknowledgement": {
      const p = payload as TemplatePayloads["contact_acknowledgement"];
      return build(
        ctx,
        "Thank you for writing to Inkinspire",
        "Your message arrived safely.",
        `Thank you, ${first(p.name)}.`,
        [
          "Your message arrived safely, and it will be read personally. You can expect a reply within a few days.",
          "In the meantime, there are stories waiting for you.",
        ],
        { label: "Read the latest stories", url: `${ctx.siteUrl}/stories` },
      );
    }
    case "staff_invite": {
      const p = payload as TemplatePayloads["staff_invite"];
      return build(
        ctx,
        "You’ve been invited to Inkinspire Studio",
        "Set your password to get started.",
        `Welcome to the Studio, ${first(p.name)}.`,
        [`You’ve been given ${p.role} access to Inkinspire Studio. Set a password to begin; you’ll then set up two-step verification to keep the publication safe.`],
        { label: "Set my password", url: p.url },
      );
    }
    case "newsletter_confirm": {
      const p = payload as TemplatePayloads["newsletter_confirm"];
      return build(
        ctx,
        "Please confirm your Inkinspire subscription",
        "One tap and the stories will find you.",
        "One more step",
        ["Please confirm that you’d like to receive new stories and letters from Inkinspire. We write when there’s something worth reading; never more than that."],
        { label: "Yes, subscribe me", url: p.url },
        ["If you didn’t ask to subscribe, ignore this email and you won’t hear from us again."],
      );
    }
    case "newsletter_welcome": {
      return build(
        ctx,
        "You’re subscribed to Inkinspire",
        "The next story will come to you.",
        "You’re on the list.",
        [
          "Thank you for subscribing. New stories, poems and reflections will arrive here when they’re published.",
          "You can unsubscribe at any time with one click, from the link at the bottom of every email.",
        ],
        { label: "Read something now", url: `${ctx.siteUrl}/stories` },
      );
    }
  }
  throw new Error(`Unknown email template: ${String(key)}`);
}
