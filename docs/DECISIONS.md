# Decisions (ADR log)

Each entry: context, decision, consequences. Conflicts between the blueprint and the build brief are recorded here; the blueprint's *requirements* win, the brief's *how* wins. Newest at the bottom.

---

## ADR-001: A purpose-built platform instead of WordPress or Ghost

**Status:** Proposed for the owner's approval (blueprint §13 says the stack must be approved by her). Work proceeds on this basis so she can object early.

**Context.** Blueprint §13 asks the developer to *evaluate* WordPress or Ghost. The blueprint's requirements include typeset poetry, a paywall the visitor cannot bypass by "viewing publicly accessible page content" (§7.6), Paystack/Flutterwave recurring billing (§7.5), a role-based command centre (§10), and full ownership (§16).

| | WordPress | Ghost | Purpose-built (Next.js) |
|---|---|---|---|
| Reading experience | Theme-limited; poetry line breaks routinely collapse; heavy page weight from plugins | Very good typography; fixed card set | Exactly what the design calls for: verse blocks, epigraphs, drop caps, reading controls |
| Editor | Gutenberg: powerful but busy | Excellent, but no literary nodes | TipTap with literary nodes, focus mode, pre-publish checklist |
| Paywall integrity | Most paywall plugins hide content with CSS/JS; full text often in HTML | Server-side, solid | Server-side, plus a CI canary test that proves it |
| Nigerian payments | Paystack plugins exist; subscription quality varies; plugin sprawl | **Stripe only** for memberships; no Paystack | Paystack first, behind an interface, Flutterwave ready |
| Security surface | Large (plugins, themes, xmlrpc); needs constant patching | Small | Small; dependencies audited in CI |
| Cost at zero revenue | Hosting ₦ monthly + premium plugins | Ghost(Pro) is paid; self-hosting needs a server | Free plans (Vercel Hobby, Neon, R2, Resend), see ADR-002 |
| Ownership / lock-in | Good (open source) | Good (open source) | Good: her GitHub, her accounts, Docker image, Markdown/JSON export |
| Maintenance without a developer | Plugin/theme updates are on her | Low | Low: no plugins; automated dependency updates |

**Decision.** Build a purpose-built platform (stack in the brief §1). Ghost is the strongest alternative; it loses on Nigerian payments (Stripe-only memberships) and on the literary editing/reading features that are the point of Inkinspire.

**Consequences.** We carry the responsibility WordPress/Ghost would have carried: auth, editor, security, backups. These are covered by tests, CI and the RUNBOOK. Content is never trapped: every story exports to Markdown and JSON.

---

## ADR-002: Hosting on free plans, and the move before payments go live

**Context.** The owner is not ready for financial commitment. The brief proposes Vercel. Vercel's Hobby (free) plan is restricted to personal, non-commercial use; commercial use requires Pro ([Vercel fair use policy](https://vercel.com/docs/limits/fair-use-guidelines)). Phases 0–2 have no payments; Phase 3 adds them. Cloudflare Workers' free plan allows commercial use, but its CPU limit per request and bundle-size limit are too tight for server-rendered pages with `sharp` and Argon2 (native modules do not run on Workers). Netlify's free plan allows commercial use but pauses **all** sites when its monthly credit allowance runs out, which is unacceptable for a public publication.

**Decision.**
1. Build to a **portable Node.js target**: no edge-only APIs; `output: "standalone"`; a production Dockerfile.
2. **Phases 0–2:** Vercel Hobby (free), deployed from her GitHub repository into her Vercel account.
3. **Before Paystack live keys are switched on (Phase 3):** move to a plan that allows commercial use. Recommended: **Vercel Pro** (simplest for a non-technical owner, paid from subscription revenue). Free alternative: **Google Cloud Run** free tier running our Docker image (allows commercial use; needs a billing card on file; cold starts mitigated by caching). Both documented in `RUNBOOK.md`. Verify each provider's free-tier terms at the time of the move.

**Consequences.** Zero hosting cost until she earns. One owner decision is queued for Phase 3 (listed in the launch checklist).

---

## ADR-003: Database on Neon's free plan, with our own backups

**Context.** Neon free: roughly 1 GB storage per project, 100 compute-hours/month, limited history window (check current numbers at sign-up). The blueprint requires automated backups that can be restored (§9, §15).

**Decision.** Neon free plan. Images never go into Postgres (R2). A nightly job writes an encrypted (`age`) `pg_dump` to her R2 bucket, keeping 30 daily + 12 monthly copies. A restore drill is performed and recorded in `RUNBOOK.md` / `QA-REPORT.md`. The schema is plain PostgreSQL (no Neon-only features), so any Postgres host works.

---

## ADR-004: Email through Resend's free plan, behind an outbox

**Context.** Resend free: about 3,000 emails/month, **100/day**. A newsletter to more than 100 people cannot go out in a day.

**Decision.** All email goes through the `email_outbox` table. The sender respects a configurable `EMAIL_DAILY_LIMIT` (default 100), always sends **transactional mail first** (verification, password reset, receipts), and spreads newsletter campaigns over consecutive days, showing progress in Studio ("412 of 650 sent; the rest go out tomorrow"). The transport is an interface (`EmailTransport`) with Resend implemented; Amazon SES or any SMTP provider can be added without touching templates. The Studio warns when the list outgrows the free plan and explains the upgrade.

---

## ADR-005: Scheduled publishing that does not depend on a paid scheduler

**Context.** Vercel Hobby cron jobs are limited, and an external pinger can be late. The brief requires scheduling to be exact to the minute and to survive restarts and deploys.

**Decision.** A story is **live** when `status = 'published'` **or** (`status = 'scheduled'` and `scheduled_at <= now()`). This is evaluated in SQL on every read, so a story appears at its time regardless of any job. Cached lists set their own lifetime to end at the next scheduled time (`cacheLife({ revalidate: secondsUntilNext })`). The minute job (`/api/cron/tick`, called by cron-job.org, free) only *finalises* the row (sets `published_at`, flips status, sends "new story" emails); it is idempotent.

**Consequences.** Exactness comes from the data model, not from timers. Tests cover "scheduled for one minute ago, no job has run, it is visible".

---

## ADR-006: Upload safety without a paid scanner

**Context.** Blueprint §9 item "malware protection"; brief §8 asks for ClamAV or a managed scanner. ClamAV needs a resident daemon with roughly 1 GB RAM; it cannot run on serverless.

**Decision.** Phase 1 accepts **images only** (JPEG, PNG, WebP, AVIF, GIF). Every upload is checked by magic bytes, size-limited, **fully decoded and re-encoded** by `sharp` (EXIF/GPS stripped). Re-encoding rebuilds the file from pixels, so a payload hidden in an image cannot survive (content disarm and reconstruction), which is stronger than signature scanning for images. Files are stored in R2 with a non-executable content type and served from the media domain. A `MalwareScanner` interface ships with a ClamAV (`clamd`) adapter for Docker deployments; non-image uploads (PDF downloads, audio; Phase 4) stay disabled until a scanner is configured.

---

## ADR-007: Content Security Policy that keeps pages fast

**Context.** The brief asks for a strict CSP with nonces. The Next.js 16 documentation states that nonces require every page to be rendered dynamically, which disables static shells and CDN caching and is incompatible with partial prerendering. That would break the performance budget (LCP ≤ 2.0 s on Nigerian mobile networks).

**Decision.** One CSP for the whole site with: `default-src 'self'`, explicit allowlists for R2 media, Turnstile, GA4 (only after consent) and Paystack; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'` (+ Paystack); `frame-ancestors 'none'`; `upgrade-insecure-requests`. `script-src` allows `'self'` plus `'unsafe-inline'` (for Next.js inline bootstrap). Compensating controls: no unsanitised HTML is ever rendered (allowlist sanitiser on editor output and comments, tested), HttpOnly session cookies (scripts cannot read them), and HSTS. Revisit when Next.js's hash-based (SRI) CSP leaves experimental status.

**Conflict noted:** brief §8 (nonces) vs brief §9 (performance budgets) and blueprint §8.4 (speed). The blueprint requirement (speed and security) is met by this combination.

---

## ADR-008: Fonts, analytics and other zero-cost choices

- **Fonts** are installed from npm (`@fontsource-variable/fraunces`, `newsreader`, `instrument-sans`; SIL Open Font Licence) and self-hosted via `next/font/local`. No request to Google Fonts; nothing for readers to consent to.
- **Analytics:** GA4 (free) after consent, plus our own `analytics_events` table, so the Studio dashboard works when readers decline cookies.
- **Spam:** Cloudflare Turnstile (free), honeypots, database-backed rate limits.
- **Search:** PostgreSQL full-text search + `pg_trgm`; no paid search service.
- **TypeScript 5.9** (the version `create-next-app` 16.4 installs) rather than 7.0, whose native compiler Next.js's type-checking does not yet use. Revisit on the next Next.js minor.

---

## ADR-009: Real 404s and 403s are decided in the proxy

**Context.** With Cache Components and partial prefetching, Next.js can send a page's shell before the page decides "not found" or "forbidden", leaving a 200 status (a "soft 404"), which is bad for SEO and for honest access control.

**Decision.** `src/proxy.ts` (Node.js runtime) returns a real **403** for Studio areas the role may not use, redirects signed-out visitors and forces first-sign-in setup, and returns a real **404** for unknown story, theme, tag, series, author and policy addresses, using a small in-memory address index (refreshed every minute and on a miss, so new stories are found immediately). Pages and actions still check permissions themselves (defence in depth). Verified by `tests/e2e/permissions.spec.ts` and direct status checks.

## ADR-010: Dynamic public pages may block on their first render

**Context.** Stories published after a deploy returned **500**: their page read the address outside a loading boundary, which Next.js 16 allows only for addresses known at build time.

**Decision.** `export const instant = false` on every public page with a variable address. The first visit to a new address waits for its data (one database round trip), then the result is cached like any other page. Regression-tested by the publishing and scheduling end-to-end tests, which visit stories created after the build.

## ADR-011: Chart colours are their own tokens

The brand accent (oxblood) fails the dataviz palette checks for chart lines (too dark for the lightness band), so charts use `--chart-1` / `--chart-2`, validated with the dataviz palette validator in every theme (lightness band, chroma, colour-vision-deficiency separation, contrast) and included in `pnpm check:contrast`. Charts have tooltips, a legend, a direct label on the latest value and a table view.

## ADR-012: JavaScript budget (conflict recorded)

**Brief §9:** initial JavaScript on a story page ≤ 100 KB gzipped. **Blueprint §8.4:** optimise scripts and loading.

**Measured (Lighthouse 13, simulated mobile, November 2026):** 169 KB transferred on a story page, of which about **140 KB is the framework itself** (React DOM 19 + the Next.js 16 App Router runtime) and about **25 KB is Inkinspire's own code** (theme switcher, consent, newsletter form, reading controls, share and bookmark buttons). The 100 KB total is below the floor of the stack the brief itself chose.

**Decision.** Keep the framework; hold our own code to a small budget (≤ 35 KB gzipped on a story page) and keep every interactive element a small island. The blueprint requirement (speed) is met by measurement: performance 95 (home), 98 (story), 99 (category); LCP 0.9–1.0 s; CLS 0; TBT 90–270 ms. Revisit if React or Next.js shrink their runtime.
