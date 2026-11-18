"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { markMessage } from "@/app/studio/actions/inbox";

type Msg = { id: string; name: string; email: string; topic: string; subject: string | null; message: string; readAt: string | null; createdAt: string };

export function InboxList({ messages }: { messages: Msg[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [, start] = useTransition();
  const router = useRouter();
  return (
    <ul className="divide-y divide-rule overflow-hidden rounded-[var(--radius-l)] border border-rule bg-surface">
      {messages.map((m) => (
        <li key={m.id}>
          <button
            type="button"
            aria-expanded={open === m.id}
            onClick={() => {
              setOpen(open === m.id ? null : m.id);
              if (!m.readAt) start(async () => { await markMessage(m.id, "read"); router.refresh(); });
            }}
            className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-sunken"
          >
            <span aria-hidden className={clsx("mt-2 size-2 shrink-0 rounded-full", m.readAt ? "bg-transparent" : "bg-accent")} />
            <span className="min-w-0 flex-1">
              <span className={clsx("block truncate", !m.readAt && "font-semibold")}>{m.name} · {m.subject || m.topic}</span>
              <span className="block truncate text-step-n2 text-ink-muted">{m.message}</span>
            </span>
            <span className="shrink-0 text-step-n2 text-ink-muted">{m.createdAt}</span>
          </button>
          {open === m.id && (
            <div className="border-t border-rule bg-bg px-4 py-4 md:pl-9">
              <p className="text-step-n2 text-ink-muted">From {m.name} &lt;{m.email}&gt; · topic: {m.topic}</p>
              <p className="mt-3 whitespace-pre-wrap font-reading text-step-0 leading-relaxed">{m.message}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "your message to Inkinspire"}`)}`} className="share-pill">Reply by email</a>
                <button type="button" onClick={() => start(async () => { await markMessage(m.id, "unread"); router.refresh(); })} className="share-pill">Mark unread</button>
                <button type="button" onClick={() => start(async () => { await markMessage(m.id, "archive"); router.refresh(); })} className="share-pill">Archive</button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
