import Link from "next/link";
import { cacheLife } from "next/cache";
import { Logo } from "@/components/brand/logo";
import { getSiteSettings } from "@/server/settings";
import { getCategories } from "@/server/content/public";
import { NewsletterForm } from "./newsletter-form";
import { SocialLinks } from "./social-links";

export async function SiteFooter() {
  const [settings, categories] = await Promise.all([getSiteSettings(), getCategories()]);
  return (
    <footer className="grain mt-24 border-t border-rule bg-sunken">
      <div className="container-ink py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo height={30} className="text-ink" />
            <p className="mt-5 max-w-sm font-reading text-step-1 italic leading-snug text-ink-soft">{settings.identity.tagline}</p>
            <div className="mt-8 max-w-md">
              <p className="eyebrow mb-3">The newsletter</p>
              <NewsletterForm source="footer" />
            </div>
          </div>
          <nav aria-label="Categories" className="md:col-span-4 md:col-start-7">
            <p className="eyebrow mb-4">Read by theme</p>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-step-n1 xs:grid-cols-2">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`} className="link-quiet text-ink-soft hover:text-ink">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Publication" className="md:col-span-2">
            <p className="eyebrow mb-4">Inkinspire</p>
            <ul className="space-y-2.5 text-step-n1">
              {[
                ["All stories", "/stories"],
                ["Authors", "/authors"],
                ["About", "/about"],
                ["Membership", "/membership"],
                ["Contact", "/contact"],
                ["RSS feed", "/feed.xml"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="link-quiet text-ink-soft hover:text-ink" prefetch={href === "/feed.xml" ? false : undefined}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-14 flex flex-col gap-6 border-t border-rule pt-8 md:flex-row md:items-center md:justify-between">
          <SocialLinks socials={settings.socials} />
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-step-n2 text-ink-muted">
            {[
              ["Privacy", "/legal/privacy"],
              ["Terms", "/legal/terms"],
              ["Cookies", "/legal/cookies"],
              ["Copyright", "/legal/copyright"],
              ["Subscription terms", "/legal/subscription-terms"],
              ["Refunds & cancellation", "/legal/refunds"],
            ].map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="hover:text-ink hover:underline">
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <a href="#cookie-preferences" data-open-consent className="hover:text-ink hover:underline">
                Cookie preferences
              </a>
            </li>
          </ul>
        </div>
        <p className="mt-6 text-step-n2 text-ink-muted">
          © <CopyrightYear /> {settings.identity.name}. All stories and poems are the original work of their authors and may not be reproduced without permission.
        </p>
      </div>
    </footer>
  );
}

async function CopyrightYear() {
  "use cache";
  cacheLife("max");
  return <>{new Date().getFullYear()}</>;
}
