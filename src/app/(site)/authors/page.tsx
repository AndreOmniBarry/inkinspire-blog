import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/story/story-listing";
import { getAuthors } from "@/server/content/public";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Authors", description: "The writers behind Inkinspire.", alternates: { canonical: "/authors" } };

export default async function AuthorsPage() {
  const authors = await getAuthors();
  return (
    <>
      <PageIntro eyebrow="The writers" title="Authors" description="The voices behind the stories." />
      <div className="container-ink py-12">
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((a) => (
            <li key={a.slug}>
              <Link href={`/authors/${a.slug}`} className="card-lift group block rounded-[var(--radius-l)] border border-rule bg-surface p-6 hover:border-rule-strong">
                <div className="size-20 overflow-hidden rounded-full bg-sunken">
                  {a.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- pre-generated variants
                    <img src={a.photo.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span aria-hidden className="flex h-full w-full items-center justify-center font-display text-step-4 text-accent italic">
                      {a.name.charAt(0)}
                    </span>
                  )}
                </div>
                <h2 className="mt-5 font-display text-step-2 group-hover:text-accent">{a.name}</h2>
                {a.tagline && <p className="mt-1 font-reading text-step-0 text-ink-soft italic">{a.tagline}</p>}
                <p className="mt-4 eyebrow">{plural(a.storyCount, "story", "stories")}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
