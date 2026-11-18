import type { ReactNode } from "react";

export function StudioHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-rule px-4 pt-6 pb-5 md:flex-row md:items-end md:justify-between md:px-10 md:pt-10">
      <div>
        <h1 className="font-display text-step-4 leading-tight">{title}</h1>
        {description && <p className="mt-2 max-w-[62ch] text-step-n1 text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function StudioSection({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="px-4 py-6 md:px-10">
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-step-2">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-l)] border border-dashed border-rule-strong px-6 py-12 text-center">
      <p className="ornament text-step-2" aria-hidden>
        ❦
      </p>
      <p className="mt-3 font-display text-step-2">{title}</p>
      <p className="mx-auto mt-2 max-w-[48ch] text-step-n1 text-ink-soft">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
