import { clsx } from "clsx";

/** Gilt "Members" mark for premium stories. Text, not just an icon, so it is clear to everyone. */
export function PremiumMark({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 font-ui text-step-n2 font-semibold tracking-[0.12em] text-gilt-ink uppercase", className)}>
      <svg aria-hidden viewBox="0 0 12 12" width="10" height="10" className="fill-gilt">
        <path d="M6 0l1.6 4.2L12 4.6 8.6 7.4 9.7 12 6 9.5 2.3 12l1.1-4.6L0 4.6l4.4-.4z" />
      </svg>
      Members
    </span>
  );
}

export function FreeMark({ className }: { className?: string }) {
  return <span className={clsx("font-ui text-step-n2 font-semibold tracking-[0.12em] text-ink-muted uppercase", className)}>Free</span>;
}
