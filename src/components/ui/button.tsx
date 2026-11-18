import Link from "next/link";
import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-ui font-semibold tracking-[0.01em] transition-[background-color,color,border-color,transform] duration-200 ease-ink select-none disabled:opacity-55 disabled:pointer-events-none active:translate-y-px whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "border border-rule-strong text-ink hover:border-ink bg-transparent",
  ghost: "text-ink hover:bg-sunken",
  danger: "bg-danger text-surface hover:opacity-90",
};
const sizes: Record<Size, string> = {
  sm: "min-h-9 px-4 text-step-n1",
  md: "min-h-11 px-5 text-step-n1",
  lg: "min-h-12 px-7 text-step-0",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return clsx(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
