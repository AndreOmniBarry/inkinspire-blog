import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/contact-form";
import { SocialLinks } from "@/components/site/social-links";
import { getSiteSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "Contact",
  description: "Write to Inkinspire: questions, collaborations, partnerships and press enquiries.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSiteSettings();
  return (
    <div className="container-ink grid gap-12 py-12 md:grid-cols-12 md:py-20">
      <div className="md:col-span-5">
        <p className="eyebrow">Contact</p>
        <h1 className="mt-4 font-display text-step-5 leading-[1.04]">Write to us.</h1>
        <p className="mt-5 max-w-[40ch] font-reading text-step-1 leading-relaxed text-ink-soft">
          A thought about a story, an idea for a collaboration, a partnership, a press enquiry, or simply hello. Every message is read personally.
        </p>
        <dl className="mt-10 space-y-6">
          <div>
            <dt className="eyebrow">Email</dt>
            <dd className="mt-1.5 font-display text-step-1">
              <a href={`mailto:${settings.identity.contactEmail}`} className="link-quiet">
                {settings.identity.contactEmail}
              </a>
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Collaborations &amp; partnerships</dt>
            <dd className="mt-1.5 max-w-[42ch] text-step-0 text-ink-soft">
              Choose “A writing collaboration” or “A partnership or sponsorship” in the form, and tell us a little about yourself and your idea.
            </dd>
          </div>
          {Object.values(settings.socials).some(Boolean) && (
            <div>
              <dt className="eyebrow">Elsewhere</dt>
              <dd className="mt-2">
                <SocialLinks socials={settings.socials} />
              </dd>
            </div>
          )}
        </dl>
      </div>
      <div className="md:col-span-6 md:col-start-7">
        <ContactForm />
      </div>
    </div>
  );
}
