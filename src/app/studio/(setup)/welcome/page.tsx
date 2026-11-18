import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { WelcomeFlow } from "@/components/studio/welcome-flow";
import { requireStaff } from "@/server/auth/session";

export const metadata: Metadata = { title: "Set up your Studio account", robots: { index: false } };

export default function WelcomePage() {
  return (
    <div className="grain min-h-dvh px-4 py-8">
      <Link href="/" aria-label="Inkinspire, home" className="mx-auto block w-fit text-ink">
        <Logo height={28} />
      </Link>
      <main id="main" className="mt-10">
        <Suspense>
          <Flow />
        </Suspense>
      </main>
    </div>
  );
}

async function Flow() {
  const user = await requireStaff("studio.access", { allowSetup: true });
  if (!user.mustChangePassword && user.twoFactorEnabled) redirect("/studio");
  return <WelcomeFlow name={user.name} mustChangePassword={user.mustChangePassword} twoFactorEnabled={user.twoFactorEnabled} />;
}
