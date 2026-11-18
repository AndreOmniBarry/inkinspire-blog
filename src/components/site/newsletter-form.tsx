"use client";

import { useActionState, useId } from "react";
import { clsx } from "clsx";
import { subscribeAction, type NewsletterState } from "@/app/actions/newsletter";
import { BotTrap, Turnstile } from "./turnstile";

const initial: NewsletterState = { status: "idle", message: "" };

export function NewsletterForm({
  source,
  tone = "default",
  className,
}: {
  source: "homepage" | "article" | "footer" | "newsletter-page";
  tone?: "default" | "inverse";
  className?: string;
}) {
  const [state, action, pending] = useActionState(subscribeAction, initial);
  const id = useId();
  if (state.status === "success") {
    return (
      <p role="status" className={clsx("font-reading text-step-1 italic", className)}>
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} className={clsx("relative", className)} noValidate>
      <input type="hidden" name="source" value={source} />
      <BotTrap />
      <label htmlFor={`${id}-email`} className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-2 xs:flex-row">
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          aria-invalid={state.status === "error" || undefined}
          aria-describedby={state.status === "error" ? `${id}-msg` : `${id}-hint`}
          className={clsx("field flex-1 rounded-full px-5", tone === "inverse" && "border-transparent")}
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[2.875rem] items-center justify-center rounded-full bg-accent px-6 text-step-n1 font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Subscribing…" : "Subscribe"}
        </button>
      </div>
      <Turnstile action="newsletter" />
      {state.status === "error" ? (
        <p id={`${id}-msg`} role="alert" className="mt-2 text-step-n1 text-danger">
          {state.message}
        </p>
      ) : (
        <p id={`${id}-hint`} className="mt-2 text-step-n2 text-ink-muted">
          Free. New stories only, never spam. Unsubscribe with one click.
        </p>
      )}
    </form>
  );
}
