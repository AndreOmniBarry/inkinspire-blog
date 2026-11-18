import type { ReactNode } from "react";

export function AuthCard({ title, intro, children, footer }: { title: string; intro?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div>
      <div className="rounded-[var(--radius-l)] border border-rule bg-surface p-6 shadow-[0_30px_70px_-45px_rgb(0_0_0/0.4)] md:p-9">
        <h1 className="font-display text-step-4 leading-tight">{title}</h1>
        {intro && <div className="mt-3 font-reading text-step-0 leading-relaxed text-ink-soft">{intro}</div>}
        <div className="mt-7">{children}</div>
      </div>
      {footer && <div className="mt-6 text-center text-step-n1 text-ink-soft">{footer}</div>}
    </div>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-step-n1 font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-step-n1 text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-step-n2 text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-5 rounded-[var(--radius-m)] border border-danger/40 bg-bg px-4 py-3 text-step-n1 text-danger">
      {message}
    </p>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
    >
      {children}
    </button>
  );
}
