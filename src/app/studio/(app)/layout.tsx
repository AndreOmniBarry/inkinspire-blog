import type { Metadata } from "next";
import { Suspense } from "react";
import { StudioSidebar } from "@/components/studio/sidebar";
import { CommandPalette } from "@/components/studio/command-palette";
import { studioNav } from "@/components/studio/nav";
import { requireStaff } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";

export const metadata: Metadata = { title: { default: "Studio", template: "%s · Inkinspire Studio" }, robots: { index: false, follow: false } };

export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return (
    <div className="studio min-h-dvh bg-bg lg:flex">
      <Suspense fallback={<aside className="hidden h-dvh w-64 shrink-0 border-r border-rule bg-surface lg:block" />}>
        <Chrome />
      </Suspense>
      <main id="main" className="min-w-0 flex-1">
        <Suspense fallback={<StudioSkeleton />}>{children}</Suspense>
      </main>
    </div>
  );
}

async function Chrome() {
  const user = await requireStaff();
  const items = studioNav.filter((i) => i.ready && can(user.role, i.permission));
  const canWrite = can(user.role, "post.create");
  return (
    <>
      <StudioSidebar items={items} user={{ name: user.name, role: user.role }} canWrite={canWrite} />
      <CommandPalette items={items} canWrite={canWrite} />
    </>
  );
}

function StudioSkeleton() {
  return (
    <div className="px-4 py-8 md:px-10" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 animate-pulse rounded bg-sunken" />
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-[var(--radius-l)] bg-sunken" />
        ))}
      </div>
    </div>
  );
}
