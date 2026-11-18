"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import {
  BarChart3, BookOpen, CalendarDays, Feather, FileText, Gem, History, Home, Images, Inbox, LayoutDashboard, Mail,
  Menu, MessageSquare, PenLine, Receipt, Settings, ShieldCheck, Tags, Users, X, ExternalLink, LogOut,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { authClient, setSignedInHint } from "@/lib/auth-client";
import type { NavItem } from "./nav";

const icons = { BarChart3, BookOpen, CalendarDays, Feather, FileText, Gem, History, Home, Images, Inbox, LayoutDashboard, Mail, MessageSquare, Receipt, Settings, ShieldCheck, Tags, Users };

export function StudioSidebar({ items, user, canWrite }: { items: NavItem[]; user: { name: string; role: string }; canWrite: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = ["Publish", "Audience", "Business", "Site"] as const;
  const isActive = (href: string) => (href === "/studio" ? pathname === "/studio" : pathname.startsWith(href));

  const signOut = async () => {
    await authClient.signOut();
    setSignedInHint(false);
    window.location.href = "/";
  };

  const nav = (
    <nav aria-label="Studio" className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-5">
        <Link href="/studio" className="text-ink" aria-label="Inkinspire Studio, overview">
          <Logo height={24} />
        </Link>
        <button type="button" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-sunken lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X aria-hidden size={18} />
        </button>
      </div>
      <p className="mt-1 px-5 font-ui text-step-n2 font-semibold tracking-[0.18em] text-gilt-ink uppercase">Studio</p>
      {canWrite && (
        <div className="px-4 pt-5">
          <Link href="/studio/write/new" onClick={() => setOpen(false)} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-4 text-step-n1 font-semibold text-on-accent hover:bg-accent-hover">
            <PenLine aria-hidden size={16} /> New story
          </Link>
        </div>
      )}
      <div className="mt-4 flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((g) => {
          const list = items.filter((i) => i.group === g);
          if (!list.length) return null;
          return (
            <div key={g} className="mt-4">
              <p className="px-2 pb-1.5 font-ui text-step-n2 font-semibold tracking-[0.12em] text-ink-muted uppercase">{g}</p>
              <ul>
                {list.map((i) => {
                  const Icon = icons[i.icon as keyof typeof icons] ?? LayoutDashboard;
                  return (
                    <li key={i.href}>
                      <Link
                        href={i.href as never}
                        onClick={() => setOpen(false)}
                        aria-current={isActive(i.href) ? "page" : undefined}
                        className={clsx(
                          "flex min-h-10 items-center gap-3 rounded-[var(--radius-m)] px-2.5 text-step-n1 font-medium transition-colors",
                          isActive(i.href) ? "bg-ink text-bg" : "text-ink-soft hover:bg-sunken hover:text-ink",
                        )}
                      >
                        <Icon aria-hidden size={17} strokeWidth={1.7} />
                        {i.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="border-t border-rule p-4">
        <p className="truncate text-step-n1 font-semibold">{user.name}</p>
        <p className="text-step-n2 text-ink-muted capitalize">{user.role}</p>
        <div className="mt-3 flex items-center gap-2">
          <Link href="/" target="_blank" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-rule px-3 text-step-n2 font-semibold hover:border-rule-strong">
            View site <ExternalLink aria-hidden size={13} />
          </Link>
          <button type="button" onClick={signOut} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-step-n2 font-semibold text-ink-soft hover:text-ink">
            <LogOut aria-hidden size={13} /> Sign out
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rule bg-bg/90 px-3 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-sunken" aria-label="Open Studio menu" aria-expanded={open}>
          <Menu aria-hidden size={20} />
        </button>
        <Link href="/studio" className="text-ink" aria-label="Studio overview">
          <Logo height={22} />
        </Link>
        {canWrite ? (
          <Link href="/studio/write/new" className="inline-flex size-11 items-center justify-center rounded-full bg-accent text-on-accent" aria-label="New story">
            <PenLine aria-hidden size={18} />
          </Link>
        ) : (
          <span className="size-11" />
        )}
      </div>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-rule bg-surface lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Studio menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_35%,transparent)]" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[min(18rem,85vw)] bg-surface shadow-xl motion-safe:animate-[sheet-in_200ms_var(--ease-out)]">{nav}</div>
        </div>
      )}
    </>
  );
}
