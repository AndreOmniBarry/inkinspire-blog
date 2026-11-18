"use client";

import { useActionState } from "react";
import { sendContactMessage, type ContactState } from "@/app/actions/contact";
import { BotTrap, Turnstile } from "@/components/site/turnstile";

const topics: Array<[string, string]> = [
  ["general", "A note or question"],
  ["collaboration", "A writing collaboration"],
  ["partnership", "A partnership or sponsorship"],
  ["press", "Press or an interview"],
  ["support", "Help with my account or membership"],
];

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactMessage, { status: "idle" });
  if (state.status === "success") {
    return (
      <div role="status" className="rounded-[var(--radius-l)] border border-rule bg-surface p-8 text-center">
        <p className="ornament text-step-2" aria-hidden>
          ❦
        </p>
        <h2 className="mt-3 font-display text-step-3">Thank you. Your message is on its way.</h2>
        <p className="mt-3 font-reading text-step-1 text-ink-soft">We’ve sent you a short confirmation. Every message is read personally.</p>
      </div>
    );
  }
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const field = (name: keyof typeof err) => ({
    "aria-invalid": err[name] ? (true as const) : undefined,
    "aria-describedby": err[name] ? `${name}-error` : undefined,
  });
  return (
    <form action={action} noValidate className="relative space-y-5">
      <BotTrap />
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-[var(--radius-m)] border border-danger/40 bg-surface px-4 py-3 text-step-n1 text-danger">
          {state.message}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-step-n1 font-semibold">
            Your name
          </label>
          <input id="name" name="name" autoComplete="name" required defaultValue={v.name} className="field" {...field("name")} />
          {err.name && <p id="name-error" className="mt-1.5 text-step-n1 text-danger">{err.name}</p>}
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-step-n1 font-semibold">
            Email address
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required defaultValue={v.email} className="field" {...field("email")} />
          {err.email && <p id="email-error" className="mt-1.5 text-step-n1 text-danger">{err.email}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="topic" className="mb-1.5 block text-step-n1 font-semibold">
          What’s it about?
        </label>
        <select id="topic" name="topic" defaultValue={v.topic || "general"} className="field" {...field("topic")}>
          {topics.map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="subject" className="mb-1.5 block text-step-n1 font-semibold">
          Subject <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input id="subject" name="subject" defaultValue={v.subject} className="field" />
      </div>
      <div>
        <label htmlFor="message" className="mb-1.5 block text-step-n1 font-semibold">
          Message
        </label>
        <textarea id="message" name="message" rows={7} required defaultValue={v.message} className="field min-h-40 resize-y leading-relaxed" {...field("message")} />
        {err.message && <p id="message-error" className="mt-1.5 text-step-n1 text-danger">{err.message}</p>}
      </div>
      <Turnstile action="contact" />
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center rounded-full bg-accent px-7 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60">
          {pending ? "Sending…" : "Send message"}
        </button>
        <p className="text-step-n2 text-ink-muted">We’ll only use your details to reply. See our privacy policy.</p>
      </div>
    </form>
  );
}
