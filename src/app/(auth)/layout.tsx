import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grain flex min-h-dvh flex-col">
      <header className="container-ink flex h-16 items-center md:h-20">
        <Link href="/" aria-label="Inkinspire, home" className="text-ink">
          <Logo height={28} />
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 md:items-center md:pt-0">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="container-ink flex flex-wrap gap-x-5 gap-y-2 pb-6 text-step-n2 text-ink-muted">
        <Link href="/legal/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/legal/terms" className="hover:text-ink">Terms</Link>
        <Link href="/contact" className="hover:text-ink">Need help?</Link>
      </footer>
    </div>
  );
}
