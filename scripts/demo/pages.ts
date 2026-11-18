/**
 * Static pages seeded on first install: About, and six legal pages.
 *
 * The legal pages are TEMPLATES, drafted to be readable and Nigeria-aware (Nigeria Data Protection
 * Act 2023, with GDPR language for international readers). They are not legal advice and must be
 * reviewed by the owner's lawyer before launch. The Studio shows a "Template: needs legal review"
 * badge until the owner edits and saves each one.
 */
export type SeedPage = { slug: string; title: string; kind: "page" | "legal"; seoDescription: string; isTemplate: boolean; body: string };

export const seedPages: SeedPage[] = [
  {
    slug: "about",
    title: "About Inkinspire",
    kind: "page",
    isTemplate: false,
    seoDescription: "The story behind Inkinspire, a literary home for stories, poetry and reflections by Xenia, the Storyteller.",
    body: `
epigraph: Some stories you read. Some stories read you. | Xenia, the Storyteller

^Inkinspire is a home for stories that stay with you: personal essays, poems, reflections and small, true moments that say something larger about being alive. It is a literary journal at heart, not a feed, and it is written to be read slowly.

## Why it exists

So much of what we read now is written to be scrolled past. Inkinspire is the opposite. Every piece here is meant to be finished, thought about, and perhaps returned to. The stories are about ordinary life, about family, love, growth and loss, and the uncomfortable truths we rarely say out loud, because ordinary life is where most of the meaning is.

## Our purpose and philosophy

We believe a good story can change the way a reader sees a single afternoon, and that this is no small thing. We believe in honesty over performance, depth over volume, and warmth over cleverness. We believe readers deserve a page that respects their attention: no clutter, no shouting, nothing between them and the words.

## Mission and vision

Our mission is to publish writing that makes people feel less alone and more awake. Our vision is a sustainable, independent literary publication, supported by the readers who value it, that grows into a home for other voices too: guest writers, spoken word, collections and conversations.

## What you can expect

Stories across eight themes: Life and Lessons, Personal Growth, Human Experiences, Relationships and Emotions, Inspirational Stories, Poetry and Creative Writing, Thought-provoking Reflections, and Uncomfortable Truths. Most are free to read. Members support the work and receive exclusive stories, letters and collections.

## The storyteller

Inkinspire is written and edited by **Sylvia Simon**, known to her readers as **Xenia, the Storyteller**. *[Owner: replace this paragraph with your own introduction: who you are, why you write, and what you hope readers take away.]*

***

If something here moves you, the kindest thing you can do is share it with one person who needs it. And if you'd like to write to us, the door is always open on the contact page.
`,
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    kind: "legal",
    isTemplate: true,
    seoDescription: "How Inkinspire collects, uses and protects your personal data under the Nigeria Data Protection Act 2023 and the GDPR.",
    body: `
*Template: to be reviewed by the owner's lawyer before launch. Last updated: [date].*

^This policy explains what personal data Inkinspire ("we", "us") collects, why, and the rights you have. We comply with the **Nigeria Data Protection Act 2023 (NDPA)** and, for readers in the European Economic Area and the United Kingdom, the **General Data Protection Regulation (GDPR)** and UK GDPR.

## Who we are

Inkinspire is operated by Sylvia Simon ("Xenia, the Storyteller"), [address], Nigeria, who is the data controller. Contact: [privacy email].

## What we collect

- **Account data:** your name, email address and a securely hashed password when you register.
- **Reading data:** stories you save, your reading progress and history, and your reading preferences, so the site can work for you.
- **Newsletter data:** your email address and a record of your consent (time and source).
- **Membership and payment data:** your plan, subscription status and payment records. **Card details are handled entirely by our payment provider (Paystack); we never see or store them.**
- **Messages:** what you send through the contact form.
- **Technical data:** a one-way, salted hash of your IP address for security and spam prevention (never the raw address), and anonymous usage statistics.

## Why we use it (lawful bases)

To provide the service you asked for (contract); to keep the site secure and prevent abuse (legitimate interests); to send newsletters and optional analytics (your consent, which you can withdraw at any time); and to keep financial records (legal obligation).

## Who we share it with

Only service providers who help us run Inkinspire, under contracts that protect your data: hosting, database, email delivery, payment processing, spam protection and, with your consent, Google Analytics. We never sell your data.

## International transfers

Some providers process data outside Nigeria. Where they do, we rely on adequacy decisions or appropriate safeguards as required by the NDPA and GDPR.

## How long we keep it

Account and reading data: while your account is active. Payment records: as long as the law requires (typically six years). Newsletter data: until you unsubscribe. Security logs: up to 12 months.

## Your rights

You can access, correct, export or delete your data, object to or restrict processing, and withdraw consent. Most of this you can do yourself in **Account › Settings** ("Download my data" and "Delete my account"). For anything else, email [privacy email]. You may also complain to the **Nigeria Data Protection Commission** or your local supervisory authority.

## Children

Inkinspire is not directed at children under 13, and we do not knowingly collect their data.

## Changes

We will post any changes here and, if they are significant, tell registered readers by email.
`,
  },
  {
    slug: "terms",
    title: "Terms and Conditions",
    kind: "legal",
    isTemplate: true,
    seoDescription: "The terms that apply when you read, register or subscribe at Inkinspire.",
    body: `
*Template: to be reviewed by the owner's lawyer before launch. Last updated: [date].*

^These terms apply to your use of Inkinspire. By using the site you agree to them. If you do not agree, please do not use the site.

## Your account

You must give accurate information, keep your password private, and tell us promptly if you think your account has been misused. You are responsible for activity under your account. You must be at least 13 to register.

## Acceptable use

Please do not: copy or republish our content beyond what the Copyright Policy allows; attempt to bypass the membership paywall or our security; post unlawful, hateful, harassing or misleading comments; or use automated means to scrape the site.

## Comments

You keep ownership of what you write in comments, and you give us permission to display it on Inkinspire. We may moderate, edit for length, or remove comments that break these terms.

## Membership

Paid memberships are governed by our Subscription Terms and our Refund and Cancellation Policy, which form part of these terms.

## Our content

All stories, poems and other content are protected by copyright and belong to their authors. See the Copyright Policy.

## Availability and changes

We work hard to keep Inkinspire available and secure, but we cannot promise it will always be uninterrupted. We may change or discontinue features, and we may update these terms; we will tell registered readers about significant changes.

## Liability

Nothing in these terms limits liability that cannot be limited by law. Otherwise, to the extent permitted by law, we are not liable for indirect or consequential loss arising from your use of the site.

## Governing law

These terms are governed by the laws of the Federal Republic of Nigeria, and the courts of [Lagos State] have jurisdiction, without affecting any mandatory consumer rights you have where you live.

## Contact

[contact email]
`,
  },
  {
    slug: "cookies",
    title: "Cookie Policy",
    kind: "legal",
    isTemplate: true,
    seoDescription: "Which cookies Inkinspire uses, why, and how to change your choices.",
    body: `
*Template: to be reviewed by the owner's lawyer before launch. Last updated: [date].*

^Cookies are small files stored by your browser. We keep them to a minimum.

## Essential cookies (always on)

- **Sign-in session:** keeps you signed in securely. It cannot be read by scripts on the page.
- **Sign-in hint:** a harmless flag that tells the page header to show "Your account" instead of "Sign in".
- **Cookie choices:** remembers what you chose in the cookie banner.
- **Security:** protects forms against misuse.

Your reading preferences (theme, text size, font) are stored on your own device and never sent to us unless you are signed in and choose to sync them.

## Analytics cookies (only with your consent)

If you allow analytics, Google Analytics 4 sets cookies to count visits anonymously and tell us which stories are read. We have enabled IP anonymisation. If you decline, Google Analytics never loads; our own anonymous, cookie-free statistics still let us see which stories are popular.

## Changing your mind

Use **Cookie preferences** in the footer of any page at any time.
`,
  },
  {
    slug: "copyright",
    title: "Copyright Policy",
    kind: "legal",
    isTemplate: true,
    seoDescription: "How you may and may not use Inkinspire's stories and poems, and how to report infringement.",
    body: `
*Template: to be reviewed by the owner's lawyer before launch. Last updated: [date].*

^Every story, poem and essay on Inkinspire is original work protected by copyright under the **Copyright Act 2022 (Nigeria)** and international treaties. Copyright belongs to the author unless stated otherwise.

## What you may do

- Read, and share **links** to any story.
- Quote a **short excerpt** (a few lines) with clear credit to the author and a link to the original, for commentary, criticism or review.
- Use the "share a quote" feature, which credits the author automatically.

## What you may not do

- Republish whole stories or poems, in print or online, without written permission.
- Remove the author's name or present the work as your own.
- Share members-only content outside Inkinspire.
- Use the work to train artificial-intelligence models without written permission.

## Permissions and licensing

To reprint, translate, perform or adapt a piece, email [permissions email]. We're glad to hear from anthologies, schools and readers.

## Reporting infringement

If you believe content on Inkinspire infringes your copyright, email [copyright email] with the work, where it appears, and your contact details. We will respond promptly.
`,
  },
  {
    slug: "subscription-terms",
    title: "Subscription Terms",
    kind: "legal",
    isTemplate: true,
    seoDescription: "How Inkinspire memberships work: plans, billing, renewal and access.",
    body: `
*Template: to be reviewed by the owner's lawyer before launch. Last updated: [date].*

^These terms apply when you become a paying member of Inkinspire.

## Plans and prices

Membership plans, their prices (shown in Naira unless stated) and their benefits are listed on the Membership page. Prices include any applicable taxes unless stated.

## Payment

Payments are processed securely by **Paystack**. We never see or store your full card details. Your membership starts once your payment has been confirmed.

## Renewal

Memberships renew automatically at the end of each period (monthly or yearly) using your saved payment method, until you cancel. We will email you a reminder **[3] days** before each renewal.

## Failed payments

If a renewal payment fails, we will email you and retry. Your access continues for a grace period of **[5] days**. If payment still cannot be taken, your membership will end and premium stories will be locked again; you can resubscribe at any time.

## Changing plans

You can switch between monthly and yearly plans from Account › Billing. The new price applies from your next renewal unless the page says otherwise.

## Cancelling

You can cancel at any time from Account › Billing. You keep access until the end of the period you have paid for. See the Refund and Cancellation Policy.

## Changes to prices

We will give you at least 30 days' notice by email of any price change, which will apply from your next renewal after the notice period.
`,
  },
  {
    slug: "refunds",
    title: "Refund and Cancellation Policy",
    kind: "legal",
    isTemplate: true,
    seoDescription: "How to cancel an Inkinspire membership and when refunds are available.",
    body: `
*Template: to be reviewed by the owner's lawyer before launch. Last updated: [date].*

## Cancelling

^You can cancel your membership at any time in **Account › Billing**. There are no cancellation fees. Your access continues until the end of the period you have already paid for, and you will not be charged again.

## Refunds

Because members get immediate access to all premium content, payments are generally **non-refundable** once a billing period has started. We will, however, refund you:

- if you were charged after you cancelled, because of an error on our side;
- if you were charged twice for the same period;
- within **[7] days** of your first-ever payment, if you have not been satisfied, once per reader;
- where the law requires it.

To ask for a refund, email [billing email] with the email address on your account. Approved refunds are returned to the original payment method by Paystack, usually within 5 to 10 working days depending on your bank.

## If we cancel

If we ever need to end your membership (for example, for a serious breach of our Terms), we will refund any unused portion of your current period unless the law says otherwise.
`,
  },
];
