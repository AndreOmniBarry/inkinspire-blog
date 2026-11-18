# INKINSPIRE: BUILD BRIEF FOR CLAUDE CODE

You are the lead engineer and design-minded product builder for **Inkinspire**, a digital storytelling and literary publication owned by **Sylvia Simon ("Xenia, the Storyteller")**. You are building two products that share one codebase and one database:

1. **The Publication**: the public reading site, with free and premium content, reader accounts, bookmarks, comments, newsletter and paid membership.
2. **Inkinspire Studio**: the command center at `/studio`, where the owner runs the whole publication alone, with no developer and no programming knowledge.

**The bar is this.** Sylvia should be able to look at the finished product next to WordPress, Medium and Substack and see that it is the better home for her writing. That means better to read, better to write in, faster, safer, and fully hers. Where this brief is silent, choose the more excellent option. Never choose the faster-to-ship option when it lowers quality. Excellence is the first requirement.

---

## 0. SOURCE OF TRUTH AND WORKING RULES

**Read first.** `docs/blueprint.docx` (the *Inkinspire Website Development Requirements and Specifications*) is the owner's requirements document. If it is not there, ask for it before writing code, then convert it to Markdown and read all of it. This brief builds on it. If the two conflict, the blueprint's *requirements* win and this brief's *how* wins. Record every conflict in `docs/DECISIONS.md`.

**One deliberate departure from the blueprint.** Section 13 says to evaluate WordPress or Ghost. We are not using either. We are building a purpose-built platform so we get exactly the reading experience, editor, access control and command center the blueprint describes, with no plugin sprawl, no theme limits and no vendor lock-in. Record this as ADR-001 in `docs/DECISIONS.md` with a short, honest comparison. The blueprint also says the owner must approve the stack. The stack below is the proposal. Proceed with it, and surface it clearly in your first status message so she can object early.

**How you work:**
- Start with `docs/PLAN.md`: architecture, data model, route map, phase plan, risk list. Then build in vertical slices (schema, server logic, UI, tests, docs), not layer by layer.
- Make a `TaskCreate` list per phase. Commit small and often with Conventional Commits.
- Never use lorem ipsum, "TODO" UI, dead buttons or fake data presented as real. Every control you ship works.
- Decide ordinary questions yourself and log them in `docs/DECISIONS.md`. Stop and ask only when you are blocked on a credential or account, or when a choice is irreversible and could go either way (for example, which payment provider is live).
- Verify visually. After every meaningful UI change, run Playwright and take screenshots at **360, 390, 768, 1024 and 1440 px**, in light, dark and sepia themes. Look at them critically, as a design director would, and fix what is mediocre before moving on. A page that merely works is not done.
- No secrets in git. Provide `.env.example` with every variable documented.
- Use British/Nigerian English in all UI copy and docs (organise, colour, programme). Store times in UTC and display them in `Africa/Lagos`.
- Verify current APIs and versions against official docs before using them (Next.js, Better Auth, Drizzle, TipTap, Paystack, Resend, Cloudflare R2). Do not rely on memory for library APIs or webhook event names.

---

## 1. PROPOSED STACK (override only with a written reason)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js (current stable, App Router, React Server Components), TypeScript `strict`** | Server-rendered, fast, SEO-strong. Premium content stays server-side. |
| Styling | **Tailwind CSS + CSS custom-property design tokens**, Radix UI primitives for accessible behaviour | Full design control, accessibility built in. |
| Motion | **Motion** (framer-motion successor) plus the View Transitions API, restrained | Subtle, as the blueprint requires. Honour `prefers-reduced-motion`. |
| Database | **PostgreSQL** (Neon by default) with **Drizzle ORM** and versioned migrations | Relational integrity for money and access. Point-in-time recovery. |
| Auth | **Better Auth** (preferred, built-in email verification and TOTP 2FA), or Auth.js if Better Auth blocks you | Email and password, verification, reset, 2FA, sessions. Social login behind a feature flag. |
| Password hashing | **Argon2id** | Current best practice. |
| Editor | **TipTap (ProseMirror)** with custom literary nodes (section 5) | The writing tool is the product. |
| Search | **Postgres full-text search (`tsvector`, weighted) plus `pg_trgm`** typo tolerance | No extra service, fast, good enough to feel excellent. |
| Media | **Cloudflare R2** (S3 API), `sharp` pipeline to AVIF/WebP, responsive `srcset`, blurhash placeholders | Cheap, fast, owner-controlled. |
| Email | **Resend** plus **React Email** templates, sent through a database **outbox** with retries | Reliable, brandable, and not locked to one vendor. |
| Payments | **Paystack (primary)** behind a `PaymentProvider` interface. Flutterwave adapter scaffolded, not enabled. | Nigerian and international cards, plans and subscriptions. |
| Spam | **Cloudflare Turnstile**, honeypot fields, rate limiting | No annoying CAPTCHAs. |
| Jobs | Scheduled publishing, email outbox, subscription sweeps, backups, run via Vercel Cron or Inngest | Reliable timers for the Studio. |
| Analytics | **GA4 (consent-gated)** plus a lightweight **first-party event table** | Studio dashboard works even when readers decline GA. |
| Testing | **Vitest, Playwright, axe-core, Lighthouse CI** | Gates the work. |
| Hosting | Default **Vercel + Neon + R2**, with a working **Dockerfile** so she is never locked in | Portability and the ownership rules in blueprint section 16. |

Everything runs in accounts **owned by Sylvia**. Document in `docs/OWNERSHIP-HANDOVER.md` exactly how each account (domain, hosting, database, R2, Paystack, Resend, analytics, GitHub) is created in her name and how access is transferred.

---

## 2. DESIGN DIRECTION: "A LITERARY JOURNAL, NOT A BLOG"

The blueprint's words are *classic, sophisticated, minimalist, editorial; elegance, depth, warmth, intelligence, creativity; clean and uncluttered*. Translate that into something people remember. It must not look like a template, and it must not look like a SaaS landing page.

### 2.1 Design tokens (start here, refine with taste)
Put these in `styles/tokens.css`. **Validate every text/background pair programmatically for WCAG AA contrast (4.5:1 body, 3:1 large text and UI)**, and adjust values until all pass.

- **Paper (light, default):** background `#FAF6EF`, surface `#FFFDF9`, ink `#1B1A17`, ink-soft `#4A463F`, rule `#E4DCCD`, accent **oxblood** `#7A1F2B`, accent-hover `#5E1621`, **gilt** `#B08A3E` (used sparingly: ornaments, premium marks, focus accents).
- **Sepia (reading mode):** background `#F3E9D6`, ink `#2B241B`, same accent family.
- **Midnight ink (dark):** background `#14120F`, surface `#1C1915`, text `#EDE6D8`, accent lightened for contrast (`~#D98A93`), gilt `~#D1AE63`.
- Subtle paper grain (very low-opacity SVG noise) on large surfaces only. Never on text.

### 2.2 Typography (self-hosted, subset, `font-display: swap`, preloaded)
- **Display and headings:** a refined variable serif with character (Fraunces, using its optical-size axis, or Cormorant Garamond if it reads better in testing).
- **Reading body:** a serif designed for screens (Newsreader or Source Serif 4).
- **UI and metadata:** a quiet sans (Instrument Sans or Inter), small caps and generous letter-spacing for bylines and labels.
- Article body **19-21 px fluid**, line-height **1.7**, measure **62-68ch**, comfortable paragraph spacing, optical margins, `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs, hanging punctuation where supported, real ligatures and proper typographic quotes.
- A modular type scale held in tokens, so hierarchy is identical everywhere.

### 2.3 Signature moments (what makes it feel authored)
- **Typographic covers.** When an article has no image, generate a beautiful cover from its title, category colour and an ornament, so poems and reflections never look empty.
- **Hero** led by large editorial typography and one featured story, not a stock-photo slider.
- **Drop caps, pull quotes, epigraphs and ornamental section breaks** as first-class article elements.
- **Poetry that is actually typeset** (section 5.2). This alone beats Medium and WordPress.
- Considered hover, focus and page transitions. Nothing bounces. Nothing is gratuitous.
- A **logo system**: an original SVG wordmark for "Inkinspire" with a refined nib or ink-drop mark, favicon set, app icons, and an OG-image template. Build it so a final logo from the owner swaps in by replacing one asset file. Note in the handover that the logo is a strong placeholder until she approves one.
- No stock-photo scraping. Imagery is uploaded by the owner. Seed content uses generated typographic covers.

### 2.4 Responsive and mobile-first
Design **mobile first** (blueprint 2.4). Test on Android Chrome, iOS Safari, tablet, laptop and desktop. Thumb-reachable navigation, large tap targets (at least 44 px), no horizontal scroll, safe-area insets, and a considered reading experience on a 360 px screen. Respect `Save-Data`: lighter images and no non-essential animation.

### 2.5 Accessibility
**WCAG 2.2 AA minimum.** Skip link, visible focus rings, full keyboard operation, semantic landmarks, correct heading order, labelled forms with useful errors, reduced-motion support, and screen-reader-tested reading and checkout flows. axe-core runs in CI with zero violations allowed.

---

## 3. THE PUBLICATION: PAGES AND BEHAVIOUR

Implement every page in blueprint section 3 and everything in section 5. Treat these as the minimum.

### 3.1 Routes
`/` · `/stories` · `/stories/[slug]` · `/category/[slug]` · `/authors` · `/authors/[slug]` · `/about` · `/contact` · `/search` · `/membership` (pricing and plans) · `/membership/checkout` · `/account` (dashboard, saved, history, billing, settings) · `/login` · `/register` · `/verify-email` · `/forgot-password` · `/reset-password` · `/newsletter/confirm` · `/newsletter/unsubscribe` · legal pages (Privacy, Terms, Cookies, Copyright, Subscription Terms, Refund and Cancellation) · `/feed.xml` · `/sitemap.xml` · `/robots.txt` · branded 404 and 500.

### 3.2 Homepage (blueprint 3.1)
Header and nav, logo, hero/welcome, featured publication, Editor's Picks, Latest, Popular (ranked from first-party read data), categories, author introduction, newsletter section, premium invitation, footer. **All of it is curated from the Studio** (drag to reorder, pick featured, no developer). Include a live-preview of the homepage inside the Studio.

### 3.3 Stories page
Editorial grid or list toggle, category filter, sort by date, search, clear **Free / Premium** marks, publication date, reading time, and pagination or "load more" (choose the better UX, with proper URLs for SEO). Skeletons and empty states are designed, not defaults.

### 3.4 The article page: the most important page on the site
- Title, cover, author, date, reading time, content, share buttons (**WhatsApp first**, then X, Facebook, LinkedIn, copy link, Web Share API on mobile), bookmark (registered readers; prompt to sign in for visitors), appreciation reaction, related stories, author bio, comments (when enabled), newsletter prompt.
- **Reading controls (blueprint 5.7):** thin reading-progress indicator; text size (5 steps); **Light / Sepia / Dark**; serif or sans body toggle; **focus mode** that hides everything but the text. Persist preferences per device, and per account when signed in. No layout shift when the theme loads (inline the theme script to prevent flash).
- Resume where you left off for signed-in readers.
- Quote sharing: select text to copy or share a beautifully typeset quote card (generated image). Build this if it lands cleanly. If it doesn't, ship it in Phase 2 and note it.

### 3.5 Search
Server-side Postgres FTS across title, excerpt, body, tags, categories and author name, with weighted ranking, typo tolerance, highlighted matches, and filters. Never leaks premium body text (see section 7).

### 3.6 Reader accounts (blueprint 5.1-5.3)
Email and password, **mandatory email verification**, password reset, account settings, password change, reading history, saved articles, subscription status, **download my data** and **delete my account** (Nigeria's NDPA 2023 and GDPR rights). Social login behind a flag, off by default.

### 3.7 Comments and reactions
Threaded comments (one level of replies), moderation queue (first-time commenters held by default), spam scoring, report button, per-article and global disable, rate limiting, sanitised output. One "appreciate" reaction per reader per article.

### 3.8 Contact
Form with Turnstile and honeypot, server validation, stored in the Studio inbox, email notification to the owner, auto-acknowledgement to the sender, a collaboration/partnership option, social links.

### 3.9 Legal pages
Draft complete, readable, Nigeria-aware templates (NDPA 2023; GDPR language for international readers) as **editable pages in the Studio**. Mark each clearly in the handover as *"template, to be reviewed by the owner's lawyer before launch."* Do not present them as legal advice.

### 3.10 Consent
A granular cookie-consent banner. GA4 and any non-essential scripts load **only after consent**. Log marketing-email consent (time, source, IP-hash).

---

## 4. INKINSPIRE STUDIO: THE COMMAND CENTER

This is the second half of the product and must feel like a professional tool, calm, fast and beautiful, and not like a default admin panel. Built with the same design system, with a Studio-specific density and layout.

### 4.1 Principles
- **A non-technical owner can run everything.** Plain language, no jargon, helpful empty states, inline guidance, confirmation before anything destructive, undo where possible.
- **Command palette (⌘/Ctrl+K)** to jump to any post, reader or page and to run actions (New story, Schedule, Moderate comments).
- Keyboard shortcuts for the editor and lists. Fully usable on a phone, because she may manage the site from one.
- Everything is **audited**: who did what, when.

### 4.2 Modules
1. **Overview (the command center).** Cards for total publications, drafts, pending review, scheduled, registered readers, newsletter subscribers, premium subscribers, active and expired subscriptions, recent payments (with status), and recent site activity. Charts for readers over time, top stories, reads completed (not just views), newsletter growth and revenue (MRR, new, churned). Use the `dataviz` skill for chart design. A "needs your attention" panel: comments to moderate, failed payments, items pending review, expiring subscriptions, scheduled posts due.
2. **Write.** The editor (section 5).
3. **Library.** All stories with status tabs (Draft, Pending Review, Scheduled, Published, Archived), search, filters, bulk actions, quick toggles for Featured and Free/Premium.
4. **Editorial calendar.** Month and week view of scheduled and published stories, drag to reschedule.
5. **Media library.** Upload, crop, focal point, **required alt text**, usage tracking, safe delete.
6. **Taxonomy.** Categories (create, rename, edit, delete with safe re-assignment of stories), tags, **Collections/Series** (curated sets such as "Letters to My Younger Self").
7. **Authors and contributors.** Profiles, photos, bios, social links, roles.
8. **Readers.** Search, view, verify, suspend, export, delete; reading and subscription summary.
9. **Memberships.** Plans (price, currency, interval monthly/yearly, benefits, access rules, renewal terms, trial optional), subscribers, manual grant or revoke (complimentary access, with a reason and audit), grace-period setting.
10. **Payments.** Full ledger, status, provider reference, receipts, refunds recorded, failed-payment queue, CSV export.
11. **Newsletter.** Subscribers (double opt-in), segments (all, free, premium), compose with the same editor, preview and test-send, send now or schedule, send history with delivery counts, automated-email template editor (section 6).
12. **Comments.** Moderation queue with approve, reject, spam and block, plus per-article and global switches.
13. **Pages.** Edit About, legal pages and any static page. Version history.
14. **Homepage curation.** Drag-and-drop the Featured story, Editor's Picks and section order, with live preview.
15. **Analytics.** First-party view (reads, completion rate, referrers, search terms, top stories, devices) with a GA4 and Search Console connection guide.
16. **Settings.** Site identity, logo and brand assets, navigation, SEO defaults, social links, commenting, integrations (Paystack keys, Resend, Turnstile, GA4), maintenance mode, demo-content removal.
17. **Security.** Own 2FA, active sessions with revoke, recovery codes, login history.
18. **Audit log** and **Backups** status (last backup, restore instructions).

### 4.3 Roles and permissions (blueprint section 10: role-based)
`owner` (everything, including billing and settings) · `admin` · `editor` (all content, moderation) · `author` (own drafts, can submit for review) · `moderator` (comments only) · `reader`. **Premium membership is an entitlement, not a role.** Enforce permissions on the **server for every action**, never only by hiding buttons. Include a permissions matrix test.

---

## 5. THE EDITOR (THE HEART OF STUDIO)

Writing here must be better than Medium or the WordPress block editor. Quiet, fast, and shaped for literature.

### 5.1 Experience
- Clean, distraction-free canvas with a **focus mode** (everything fades except the current paragraph).
- **Autosave** every few seconds, with visible "Saved" state, offline tolerance, and **revision history** with diff and one-click restore.
- Slash-menu and floating toolbar. Keyboard-first. Paste from Word and Google Docs cleans up to semantic content. Markdown shortcuts and Markdown import.
- Live **word count**, **reading time** (about 230 wpm), and a side panel for: title, subtitle, slug, excerpt, cover image (with alt text), category, tags, collection, author, visibility, featured toggle, schedule, SEO title and description with a **Google-result preview and a social-card preview**.
- **Pre-publish checklist** that warns, without blocking the owner, about: missing alt text, missing excerpt, no category, very long title, missing cover, broken links, and an unset paywall point on a premium story.

### 5.2 Literary nodes (our edge)
Build these as custom TipTap nodes that render beautifully on the public site and in email:
- **Verse block:** preserves line breaks, stanza spacing and indentation, with a proper typographic treatment, optional line numbers, and never collapses on mobile.
- **Epigraph** with attribution.
- **Pull quote.**
- **Ornamental section break** (gilt ornament).
- **Drop-cap** toggle on the opening paragraph.
- **Image with caption and credit.**
- **Paywall marker:** "Everything below is for members." The editor decides the exact preview split. This is how preview excerpts work (blueprint 7.6).
- Reserve architecture for **audio embeds** (spoken word), for Phase 4.

### 5.3 Storage
Persist **TipTap JSON** as the source of truth, and render it to **server-sanitised HTML** with an allowlist. Also store derived plain text for search and reading-time. Content must be portable: provide **export to Markdown and JSON** for every story, so the owner is never trapped.

### 5.4 Workflow (blueprint 4.2)
Statuses: **Draft → Pending Review → Scheduled → Published → Archived**. Authors can submit for review. The owner or an editor approves, requests changes with a note, or publishes. **Scheduled publishing is exact** to the minute and survives restarts and deploys (test it). Archived stories keep their URLs, with an "archived" notice.

---

## 6. NEWSLETTER AND EMAIL (blueprint section 6)

- **Double opt-in** subscription form on homepage, article pages and footer. One-click unsubscribe (**List-Unsubscribe and List-Unsubscribe-Post headers**, plus a visible link in every marketing email).
- Send through the **outbox** with retries, rate limits, bounce and complaint handling, and suppression lists.
- **Beautiful branded email templates** (React Email) that match the site: Welcome, Verify email, New publication notification, Newsletter, Subscription confirmation, Payment receipt, Renewal reminder (configurable days before), Subscription expiry, Payment failed, Password reset. Test them in light and dark clients, and on mobile.
- Premium newsletters go only to entitled subscribers. The free version contains the preview only.
- Configure SPF, DKIM and DMARC, with step-by-step instructions in the handover docs for her domain.

---

## 7. MEMBERSHIP, PAYMENTS AND ACCESS CONTROL (blueprint section 7)

This is where careless builds fail. Money and access must be exact.

### 7.1 Provider layer
Define `PaymentProvider` (create customer, initialise transaction, verify transaction, create/cancel subscription, handle webhook, refund). Implement **Paystack** fully. Scaffold **Flutterwave** with documented gaps. **Before coding, investigate and document in `docs/PAYMENTS.md`** (blueprint 7.5): Nigerian payment methods, international card support, recurring billing availability and its limits, automatic confirmation, verification, refunds, and failed-payment handling. Confirm against *current* official docs, since this changes. Note any limitation honestly.

### 7.2 Plans
Configurable in Studio: price, currency (NGN by default, with USD only if the owner's Paystack account supports it), monthly and yearly intervals, benefits, access rules. Keep plans in your database and sync them to Paystack plans.

### 7.3 Payment safety rules (non-negotiable)
- **Never store, log or transmit raw card data.** Use hosted or inline provider checkout only.
- **Never trust the browser redirect.** Grant access only after **server-side verification** of the transaction *and* a verified webhook.
- **Verify webhook signatures** (HMAC-SHA512 with the secret key, constant-time comparison) on the *raw* body. Reject anything unsigned.
- **Idempotency:** store every webhook event by its ID, and process each exactly once, safely under concurrency and replays.
- Reconcile amounts and currency against the plan so a tampered amount can never grant access.
- A nightly **reconciliation job** that compares provider state with our database and flags drift in Studio.
- A **sandbox mode** switch. Everything must be tested in sandbox before live (blueprint 15).

### 7.4 Subscription state machine
`none → active → (cancel-at-period-end: still active until period end) → expired`, and `active → past_due (grace period, configurable) → active | expired`. Cover: renew, cancel, resubscribe, upgrade/downgrade between plans, failed payment with dunning emails, refund (access policy chosen by the owner), and manual complimentary grants. Include a unit test for every transition.

### 7.5 Premium content protection (blueprint 7.6)
Premium body content **must never reach an unauthorised client**:
- The full body is rendered **only on the server, after an entitlement check**. Visitors and non-members receive the preview (up to the paywall marker) plus a designed upgrade prompt.
- The premium body must be absent from: the HTML source, the React Server Component payload, JSON endpoints, `__NEXT_DATA__`-style blobs, JSON-LD, RSS, sitemaps, OG images and descriptions, search indexes and snippets (index only the public preview), and cached CDN responses. **Ensure caching varies by entitlement, so a member's page is never served to a visitor.**
- Use schema.org paywalled-content markup (`isAccessibleForFree`) so search engines treat the paywall correctly.
- **Write a test** that seeds a premium story with a unique canary string in the protected portion, then fetches it as anonymous, as a free reader, as an expired member and as an active member, and asserts the canary appears **only** for the active member, across the HTML, RSC payload and all APIs. This test must run in CI and block merges.

---

## 8. SECURITY AND DATA PROTECTION (blueprint section 9)

- Argon2id, strong password policy with breached-password check, **mandatory TOTP 2FA with recovery codes for every Studio role**, rate limiting and lockout on auth endpoints, no account enumeration, hashed single-use expiring tokens for verification and reset.
- **HttpOnly, Secure, SameSite cookies**, CSRF protection, strict **CSP with nonces**, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame protection.
- Input validation (Zod) on every server boundary. Parameterised queries only. Allowlist HTML sanitisation for the editor output and for comments.
- Uploads: validate by magic bytes, enforce size limits, strip EXIF (especially GPS), re-encode images, and never serve user uploads from a path that executes.
- **Malware protection (blueprint 9.42):** scan every upload before it is stored or served (ClamAV or a managed scanning service), quarantine failures, and keep the runtime on a managed, patched platform with no writable code paths.
- Secrets only in environment variables. A `docs/SECURITY.md` documenting the threat model.
- **Audit log** for sensitive actions. **Automated, encrypted, off-site database backups** (nightly) plus provider point-in-time recovery, and a **tested restore** documented in `docs/RUNBOOK.md` (blueprint 15 requires that backups can be restored, so perform a real restore drill and record the result).
- Dependency auditing and automated updates in CI. A security regression test suite. Perform a self-review against the OWASP Top 10 and record the results.
- Privacy by design: collect the minimum, hash IPs, support data export and deletion.

---

## 9. PERFORMANCE, SEO AND ANALYTICS (blueprint 8.4-8.6)

**Performance budgets (enforced in CI with Lighthouse CI on a throttled mobile profile):**
- Lighthouse **≥ 95** for Performance, Accessibility, Best Practices and SEO on the home page, a story page and a category page.
- **LCP ≤ 2.0 s**, **CLS ≤ 0.05**, **INP ≤ 200 ms**.
- Initial JavaScript on a story page **≤ 100 KB gzipped**. Server-render everything readable. Hydrate only interactive islands.
- Use ISR or tag-based revalidation so public pages are served from cache and updated on publish. Optimise images, preload the critical font, and index the database for every query pattern. Many readers are on mobile networks in Nigeria, so a story must feel instant on 3G and 4G.

**SEO:** custom SEO title and description per page, clean slugs, canonical URLs, `sitemap.xml`, `robots.txt`, image alt text, correct heading hierarchy, internal linking (related stories, categories, series), dynamic **OG and Twitter images** per story, **JSON-LD** (`Article`, `Person`, `Organization`, `BreadcrumbList`, `WebSite` with SearchAction, paywall markup), an RSS feed, and no accidental `noindex`. Provide a Search Console verification setup and a guide.

**Analytics:** GA4 behind consent, plus the first-party tables that power the Studio dashboard. Track *meaningful* metrics: reads completed (scroll depth and time), returning readers, newsletter signups, premium conversions by story.

---

## 10. DATA MODEL (a starting point; refine in `docs/PLAN.md`)

`users`, `sessions`, `accounts`, `two_factor`, `roles/permissions`, `authors`, `posts` (status, visibility, content JSON, derived text, excerpt, cover, SEO, scheduled_at, published_at, reading_time, search vector), `post_revisions`, `categories`, `tags`, `post_tags`, `collections`, `collection_posts`, `media`, `bookmarks`, `reading_history`, `reactions`, `comments`, `newsletter_subscribers`, `newsletter_campaigns`, `email_outbox`, `email_events`, `plans`, `subscriptions`, `payments`, `payment_events` (webhook log, unique by provider event ID), `entitlements`, `contact_messages`, `pages`, `homepage_slots`, `site_settings`, `analytics_events`, `audit_log`, `consent_log`, `feature_flags`.

Model money in the **smallest currency unit** (kobo and cents), never floats. Use foreign keys, constraints and indexes. Add nullable or reserved structure now for Phase 4: multiple authors per story, guest writers, audio URL, downloadable files.

---

## 11. DEMO CONTENT

Seed the **8 categories from the blueprint**: Life and Lessons, Personal Growth, Human Experiences, Relationships and Emotions, Inspirational Stories, Poetry and Creative Writing, Thought-provoking Reflections, Uncomfortable Truths. Add **12 sample stories** you write yourself as short, original pieces of real quality (including 2 poems that exercise the verse block, and 3 premium stories that exercise the paywall). **Do not reproduce any existing copyrighted text.** Include the owner as author with a clear bio placeholder. Label everything as demo content, and provide **one command and one Studio button** that removes all demo content cleanly.

First-login flow for the seeded owner account: forced password change and 2FA enrolment. Use no default passwords in production.

---

## 12. PHASES AND GATES

Follow the blueprint's phases, but design the **data model, entitlement layer and design system up front**, because retrofitting them is where quality dies. **Do not start a phase until the previous gate passes.** After each gate, post a short status: what was built, screenshots, what remains.

**Phase 0: Foundation.** Repo, tooling, CI, design tokens and base components, database and migrations, auth skeleton, `docs/PLAN.md`, `docs/DECISIONS.md`, `docs/TRACEABILITY.md` (a table mapping every blueprint section and bullet to implementation and test).
*Gate:* CI green, tokens contrast-validated, a styled shell deployed to a preview URL.

**Phase 1: Foundation and launch (blueprint Phase One).** Public pages, article template with reading controls, categories, search, contact, SEO, Studio core (Overview, Write, Library, Media, Taxonomy, Authors, Pages, Homepage curation, Settings, Security, Audit), editor with literary nodes, workflow and scheduling, roles, responsive polish.
*Gate:* an owner can create, schedule and publish a story from a phone, and it appears on the site correctly. Lighthouse and axe budgets are met.

**Phase 2: Reader engagement (blueprint Phase Two).** Registration with verification, reader dashboard, bookmarks, history, newsletter with double opt-in and outbox, automated emails, comments and moderation, reactions, related stories, reading preferences that sync to the account, search improvements. Offline reading of saved free stories (service worker) as a stretch.
*Gate:* every Phase 2 acceptance item in section 13 passes.

**Phase 3: Monetisation (blueprint Phase Three).** Plans, Paystack checkout, webhooks, subscription state machine, premium protection, payment emails, subscriber dashboard, Payments and Memberships modules, reconciliation, dunning.
*Gate:* full sandbox lifecycle passes (subscribe, renew, fail, grace, expire, cancel, refund) **and** the premium canary test passes.

**Phase 4: Hardening and handover.** Security review, performance pass, full end-to-end run, backup restore drill, documentation, admin training material, handover checklist. Phase 4 *expansion features* (guest writers, audio, downloads, community) are **not** built now, but the architecture must visibly accommodate them (note where in `docs/ARCHITECTURE.md`).

---

## 13. DEFINITION OF DONE (blueprint section 15, as automated tests wherever possible)

Every line below needs evidence: a Playwright test, a unit test or a recorded manual result in `docs/QA-REPORT.md`.

- All pages load; navigation works; no broken links (crawl test).
- Correct on mobile and desktop at the five breakpoints and three themes.
- Articles can be created, edited, scheduled and published; scheduling fires on time.
- Categories can be created, renamed, edited and deleted safely.
- Search returns relevant results and never leaks premium text.
- Registration, **email verification**, login and **password recovery** work.
- Bookmarks and reading history work.
- Newsletter double opt-in, send and one-click unsubscribe work.
- **Premium restrictions are enforced** (canary test, section 7.5).
- **Payments are verified server-side** and subscription access updates correctly on renew, cancel, fail and expire (sandbox).
- Contact form works with spam protection.
- A backup is **restored** successfully (drill recorded).
- No critical or high security findings. Dependency audit is clean.
- Lighthouse budgets and Core Web Vitals met; axe reports zero violations.
- The permissions matrix test passes for every role.

---

## 14. DELIVERABLES (blueprint section 14)

1. The full repository, clean and runnable with `pnpm install && pnpm dev`, with seed data.
2. Deployed preview (and production-ready config) with HTTPS, domain and email DNS instructions.
3. `docs/`:
   - `ARCHITECTURE.md`, `DECISIONS.md`, `PLAN.md`, `TRACEABILITY.md`
   - `PAYMENTS.md`, `SECURITY.md`, `RUNBOOK.md` (deploy, rollback, backup and restore, incident steps)
   - **`ADMIN-GUIDE.md`**: plain-language, screenshot-led guide for Sylvia: publishing, scheduling, curating the homepage, moderating, running a newsletter, managing plans and reading the dashboard. Written for a non-technical person.
   - `OWNERSHIP-HANDOVER.md`: a checklist ensuring she owns the domain, hosting, database, storage, payment, email, analytics and source code (blueprint 16).
   - `QA-REPORT.md`
4. A short **launch checklist** listing everything only the owner can do: buy the domain, create accounts, supply Paystack live keys after sandbox sign-off, approve the logo, have a lawyer review the legal templates, replace demo content.

---

## 15. HOW TO REPORT BACK

Be brief and concrete. Lead with what is now working and what the owner can try. Show screenshots. State what is not done and why. Do not narrate your steps. When you hit a decision that is genuinely hers (logo, pricing, live payment switch, legal text), list it plainly with your recommendation. At the end of each phase, give a one-paragraph summary and the exact commands to run it.

**Begin now:** read `docs/blueprint.docx` in full, write `docs/PLAN.md` and ADR-001, post a short status that names the stack and any conflict with the blueprint, then start Phase 0.
