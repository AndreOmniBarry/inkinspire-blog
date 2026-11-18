"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeSwitcher } from "./theme-switcher";
import { AccountLink } from "./account-link";

/** Full-height sheet for phones: big tap targets, focus trapped, Esc closes, returns focus. */
export function MobileMenu({ nav }: { nav: Array<{ label: string; href: string }> }) {
  const [open, setOpen] = useState(false);
  const [pathname, setPathname] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- current path is only known in the browser
    if (open) setPathname(window.location.pathname);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink hover:bg-sunken md:hidden"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu aria-hidden size={22} strokeWidth={1.6} />
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        aria-label="Menu"
        className="m-0 ml-auto h-dvh max-h-none w-[min(24rem,100vw)] max-w-none bg-bg p-0 text-ink backdrop:bg-[color-mix(in_srgb,var(--ink)_35%,transparent)] open:animate-[sheet-in_220ms_var(--ease-out)]"
      >
        <div className="flex h-full flex-col px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Menu</span>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-sunken"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden size={22} strokeWidth={1.6} />
            </button>
          </div>
          <nav aria-label="Main" className="mt-8">
            <ul className="space-y-1">
              {[{ label: "Home", href: "/" }, ...nav, { label: "Search", href: "/search" }, { label: "Contact", href: "/contact" }].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className="block py-2.5 font-display text-step-3 leading-tight aria-[current=page]:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto space-y-6">
            <div>
              <p className="eyebrow mb-3">Reading theme</p>
              <ThemeSwitcher compact />
            </div>
            <div className="flex items-center justify-between border-t border-rule pt-5">
              <AccountLink className="text-step-0 font-semibold underline-offset-4 hover:underline" />
              <Link href="/membership" onClick={() => setOpen(false)} className="rounded-full bg-accent px-5 py-2.5 text-step-n1 font-semibold text-on-accent">
                Become a member
              </Link>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
