import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { getSiteSettings } from "@/server/settings";
import { MobileMenu } from "./mobile-menu";
import { AccountLink } from "./account-link";
import { ThemeSwitcher } from "./theme-switcher";

export async function SiteHeader() {
  const settings = await getSiteSettings();
  return (
    <header data-site-header className="sticky top-0 z-40 border-b border-rule/70 bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur-md supports-[not(backdrop-filter:blur(1px))]:bg-bg">
      <div className="container-ink flex h-16 items-center gap-4 md:h-[4.5rem]">
        <Link href="/" className="-ml-1 shrink-0 rounded p-1 text-ink" aria-label={`${settings.identity.name}, home`}>
          <Logo height={26} className="md:hidden" />
          <Logo height={30} className="hidden md:block" />
        </Link>
        <nav aria-label="Main" className="ml-6 hidden md:block">
          <ul className="flex items-center gap-7 text-step-n1 font-medium text-ink-soft">
            {settings.navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="link-quiet py-2 hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1 md:gap-3">
          <Link
            href="/search"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-soft hover:bg-sunken hover:text-ink"
            aria-label="Search stories"
          >
            <Search aria-hidden size={20} strokeWidth={1.6} />
          </Link>
          <div className="hidden lg:block">
            <ThemeSwitcher compact />
          </div>
          <AccountLink className="hidden min-h-11 items-center px-2 text-step-n1 font-medium text-ink-soft hover:text-ink md:inline-flex" />
          <Link
            href="/membership"
            className="hidden min-h-10 items-center rounded-full bg-accent px-5 text-step-n1 font-semibold text-on-accent transition-colors hover:bg-accent-hover md:inline-flex"
          >
            Become a member
          </Link>
          <MobileMenu nav={settings.navigation} />
        </div>
      </div>
    </header>
  );
}
