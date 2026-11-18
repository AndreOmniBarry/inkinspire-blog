# Inkinspire: Build Plan

_Owner: Sylvia Simon ("Xenia, the Storyteller"). Source of truth: [`blueprint.md`](./blueprint.md) (converted from `blueprint.docx`). How we build it: [`BUILD-BRIEF.md`](./BUILD-BRIEF.md). Every decision is logged in [`DECISIONS.md`](./DECISIONS.md); every blueprint line is mapped in [`TRACEABILITY.md`](./TRACEABILITY.md)._

**Guiding constraint (from the owner, November 2026):** no financial commitment at this stage. Every service starts on a free plan that permits what we need, and nothing becomes paid without her choosing it. Free never means worse: where a free plan would weaken quality, we design around the limit rather than accept it (see ADR-002 to ADR-008).

---

## 1. Architecture

```
                       ┌──────────────────────────── Next.js 16 app (one codebase) ──────────────────────────┐
 Reader ── HTTPS ──▶   │  Publication (app/(site))     Studio (app/studio)       API (app/api)               │
                       │  static shells + cached       session-gated, dynamic    webhooks, cron, export,     │
                       │  data; member-only parts      (owner/editor/author/     newsletter, analytics       │
                       │  stream behind <Suspense>     moderator)                beacon                      │
                       │                         ▲                                                           │
                       │        server-only Data Access Layer (src/server/*): every read/write checks         │
                       │        permissions + entitlements; Zod at every boundary; audit log on mutations     │
                       └───────────┬──────────────┬───────────────┬───────────────┬──────────────┬───────────┘
                                   │              │               │               │              │
                           PostgreSQL (Neon)   Cloudflare R2   Resend (email)  Paystack      Turnstile / GA4
                           Drizzle + migrations media (S3 API)  via DB outbox   (payments)    (consent-gated)
```

- **One Next.js app, App Router, React Server Components, Cache Components enabled.** Public pages are prerendered into static shells; data is cached with `"use cache"` + `cacheTag`, and invalidated on publish with `revalidateTag`/`updateTag`. Anything that depends on who the reader is (bookmark state, member-only body, account) is read at request time behind a `<Suspense>` boundary, so it is **never** part of a cached or shared response.
- **Server-only Data Access Layer** (`src/server/`). Components never query the database directly. Each DAL function resolves the session itself and enforces the permission matrix (`src/server/auth/permissions.ts`). Studio actions are Server Actions that call the DAL; hiding a button is never the protection.
- **Node.js runtime everywhere** (no edge-only code), so the same build runs on Vercel, in Docker, on Cloud Run or any Node host (ADR-002).
- **Jobs without a paid scheduler.** `/api/cron/tick` (bearer-secret protected) finalises scheduled posts, drains the email outbox, runs subscription sweeps and reconciliation. It is called every minute by a free external scheduler (cron-job.org) with a GitHub Actions hourly backup. Critically, **scheduled publishing does not depend on the cron at all** (ADR-005): a scheduled story becomes visible the moment its time passes because "live" is defined as `published OR (scheduled AND scheduled_at <= now())`, and every cached list sets its own expiry to the next scheduled time.

### 1.1 Premium content protection (blueprint 7.6)
The full body of a premium story is treated like a secret.

1. On save, the editor's TipTap JSON is split at the **paywall marker** into `preview` and `full`. We store `content_json` (full, source of truth), `preview_html`, `body_html` (full), `preview_text`, and `search_text`. For premium stories, `search_text` and the search vector are built **from the preview only**.
2. Public rendering code (`src/server/content/public.ts`) has no access path to `body_html` or `content_json` for premium stories: its queries select explicit columns, and a unit test asserts that.
3. The only reader of the protected body is `getProtectedBody(postId)` in `src/server/content/protected.ts` (`import "server-only"`). It resolves the session, checks the entitlement, and returns either the HTML or `null`.
4. The article page's static shell (cached, shareable) renders title, cover, byline and the **preview**. The remainder renders inside `<Suspense>` in `<MemberContinuation>`, which reads the session at request time. A request-time render is never stored in a shared cache, so a member's page cannot be served to a visitor.
5. JSON-LD (`isAccessibleForFree: false` + `hasPart` `cssSelector`), RSS, sitemap, OG images, meta descriptions, search snippets and newsletter "free" versions all draw from preview fields only.
6. **Canary test** (`tests/e2e/premium-canary.spec.ts`): seeds a premium story with a unique canary in the protected part and fetches the page (HTML + RSC payload via `RSC: 1` header), search, RSS, sitemap, OG image route and every JSON endpoint as anonymous, free reader, expired member and active member. The canary may appear **only** for the active member. Runs in CI; failure blocks the merge.

### 1.2 Design system
`src/styles/tokens.css` holds every colour, type size, space, radius, shadow and motion value as CSS custom properties for three themes (Paper, Sepia, Midnight). Tailwind 4 reads them through `@theme inline`. `scripts/check-contrast.ts` computes WCAG contrast for every declared text/background pair in every theme and fails CI if any pair is below 4.5:1 (body) or 3:1 (large text/UI). Fonts are self-hosted from `@fontsource-variable/*` packages through `next/font/local` (preloaded, `swap`, metric-matched fallbacks): **Fraunces** (display, optical size axis), **Newsreader** (reading body, optical size axis), **Instrument Sans** (UI).

### 1.3 Editor
TipTap 3 (ProseMirror) with custom nodes: `verse`, `epigraph`, `pullQuote`, `ornamentBreak`, `figure` (image + caption + credit), `paywall`, and a `dropCap` attribute on paragraphs. A single **schema module** (`src/lib/editor/schema.ts`) is shared by the Studio editor and the server renderer (`@tiptap/html` + `sanitize-html` allowlist) so what she sees is what readers get. Exports: Markdown and JSON per story. Autosave to `post_revisions` with diff and restore.

---

## 2. Data model

PostgreSQL, Drizzle ORM, versioned SQL migrations in `drizzle/`. UUID v7 primary keys (time-ordered, no enumeration). All times `timestamptz` in UTC; displayed in `Africa/Lagos`. Money in **minor units** (`bigint` kobo/cents) with an ISO 4217 `currency` column; never floats.

| Area | Tables | Notes |
|---|---|---|
| Identity | `users`, `sessions`, `accounts`, `verifications`, `two_factors` | Better Auth core tables (`users.role` enum: owner, admin, editor, author, moderator, reader). `users.status` (active, suspended), `must_change_password`, `deleted_at`. |
| People | `authors` | Public profile, optionally linked to a `users` row. Slug, photo, bio, socials. Guest writers (Phase 4) are authors without a staff role. |
| Content | `posts`, `post_authors`, `post_revisions`, `categories`, `tags`, `post_tags`, `collections`, `collection_posts` | `posts`: status (draft, pending_review, scheduled, published, archived), visibility (free, premium), content JSON, derived HTML/text, excerpt, cover, SEO fields, `scheduled_at`, `published_at`, `reading_minutes`, `word_count`, `featured`, `comments_enabled`, `review_note`, `is_demo`, weighted `search_vector` (generated), reserved `audio_url`, `download_media_id` for Phase 4. `post_authors` supports multiple authors (Phase 4) from day one. |
| Media | `media` | R2 key, mime, size, width, height, blurhash, focal point, **alt (required)**, credit, scan status, `is_demo`. Usage computed from references. |
| Reader | `bookmarks`, `reading_history` (progress %, last position, completed_at), `reactions` (unique per user+post), `reader_preferences` | |
| Community | `comments` (one level of replies via `parent_id`, status: pending, approved, rejected, spam), `comment_reports`, `blocked_commenters` | |
| Email | `newsletter_subscribers` (double opt-in tokens, status, segment, consent source/time/IP-hash), `newsletter_campaigns`, `email_outbox` (idempotency key, attempts, next_attempt_at), `email_events` (delivered, bounced, complained), `email_suppressions`, `email_templates` | |
| Money | `plans`, `subscriptions`, `payments`, `payment_events` (unique `(provider, event_id)`), `entitlements` (source: subscription, complimentary; starts/ends), `refunds`, `reconciliation_issues` | State machine in `src/server/billing/state-machine.ts`. |
| Site | `pages` + `page_revisions`, `homepage_slots`, `site_settings` (typed key/value), `navigation_items`, `contact_messages`, `feature_flags` | |
| Trust | `audit_log`, `consent_log`, `analytics_events`, `rate_limits`, `login_events` | IPs stored only as salted SHA-256 hashes. |

Indexes for every query pattern are declared next to the tables (status + published_at, category + published_at, slug unique, GIN on `search_vector`, trigram GIN on title, etc.).

---

## 3. Route map

**Publication** (`src/app/(site)`): `/`, `/stories`, `/stories/[slug]`, `/category/[slug]`, `/collections/[slug]`, `/tags/[slug]`, `/authors`, `/authors/[slug]`, `/about`, `/contact`, `/search`, `/membership`, `/membership/checkout`, `/account` (+ `/saved`, `/history`, `/billing`, `/settings`), `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/two-factor`, `/newsletter/confirm`, `/newsletter/unsubscribe`, `/legal/[slug]` (privacy, terms, cookies, copyright, subscription-terms, refunds), `/feed.xml`, `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, OG images per story, branded `not-found` and `error`.

**Studio** (`src/app/studio`): `/studio` (Overview), `/studio/write/[id]`, `/studio/library`, `/studio/calendar`, `/studio/media`, `/studio/taxonomy`, `/studio/authors`, `/studio/readers`, `/studio/memberships`, `/studio/payments`, `/studio/newsletter`, `/studio/comments`, `/studio/pages`, `/studio/homepage`, `/studio/analytics`, `/studio/inbox`, `/studio/settings`, `/studio/security`, `/studio/audit`, `/studio/backups`, `/studio/welcome` (first-login: password change + 2FA).

**API** (`src/app/api`): `/api/auth/[...all]` (Better Auth), `/api/cron/tick`, `/api/webhooks/paystack`, `/api/webhooks/resend`, `/api/newsletter/*`, `/api/media/upload`, `/api/analytics/beacon`, `/api/export/story/[id]`, `/api/account/export`.

---

## 4. Phase plan and gates

| Phase | Scope | Gate |
|---|---|---|
| **0 Foundation** | Repo, tooling, CI, tokens + contrast validation, fonts, base components, schema + migrations, auth skeleton, Dockerfile, docs (PLAN, DECISIONS, TRACEABILITY). | CI green; tokens contrast-validated; styled shell runs; preview deploy (needs owner's Vercel account, see launch checklist). |
| **1 Launch** | Public pages, article template + reading controls, categories, search, contact, SEO, Studio core (Overview, Write, Library, Calendar, Media, Taxonomy, Authors, Pages, Homepage, Settings, Security, Audit), editor + literary nodes, workflow + scheduling, roles, demo content, legal templates. | Owner creates, schedules and publishes from a phone; appears correctly; Lighthouse ≥ 95 and axe = 0. |
| **2 Engagement** | Registration + verification, reader dashboard, bookmarks, history, resume reading, newsletter (double opt-in, outbox), automated emails, comments + moderation, reactions, related stories, synced preferences. | Phase 2 items in brief §13 pass. |
| **3 Monetisation** | `docs/PAYMENTS.md` research first. Plans, Paystack checkout, webhooks, state machine, premium protection hardening, payment emails, subscriber dashboard, Payments + Memberships modules, reconciliation, dunning. | Full sandbox lifecycle passes **and** canary test passes. |
| **4 Hardening** | OWASP review, performance pass, end-to-end run, backup restore drill, ADMIN-GUIDE, handover. | Definition of Done (brief §13) evidenced in `QA-REPORT.md`. |

The data model, entitlement layer and design system are built in Phase 0/1 in full, because retrofitting them is where quality dies.

---

## 5. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Free hosting plan forbids commercial use once payments go live (Vercel Hobby). | Certain | High | Portable Node build + Dockerfile. Documented move to Vercel Pro or Cloud Run's free tier **before** Paystack live keys (ADR-002). |
| Resend free plan caps at 100 emails/day. | High once list grows | Medium | Outbox respects a configurable daily cap, prioritises transactional mail over newsletters, spreads campaigns over days, shows the queue in Studio; provider-agnostic interface allows SES later (ADR-004). |
| Neon free plan storage (about 1 GB) and limited point-in-time history. | Medium | High | Images live in R2, not Postgres. Nightly encrypted `pg_dump` to R2 + restore drill (ADR-003). |
| Paystack recurring billing limits (e.g. card-only subscriptions, currency availability). | Medium | High | Research and document before coding (Phase 3, `PAYMENTS.md`); renewal-by-invoice fallback for non-card methods. |
| Strict nonce CSP disables static rendering. | Certain | Medium | Hash/allowlist CSP for static pages, every other header strict; no unsanitised HTML anywhere (ADR-007). |
| Malware scanning (ClamAV) cannot run on serverless. | Certain | Medium | Uploads limited to images, which are fully decoded and re-encoded (content disarm); `MalwareScanner` interface with ClamAV adapter for Docker hosts; non-image uploads stay disabled until a scanner is configured (ADR-006). |
| Next.js 16 Cache Components is new; mistakes could cache personal data. | Medium | High | Personal data only in request-time components; canary + "no personal data in shared cache" tests. |
| Non-technical owner locked out (lost 2FA device). | Medium | High | Recovery codes shown at enrolment and downloadable; documented recovery procedure in RUNBOOK. |
| One builder, large scope. | High | Medium | Vertical slices with gates; nothing is marked done without evidence in `QA-REPORT.md`. |
