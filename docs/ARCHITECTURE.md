# Architecture

Companion to [`PLAN.md`](./PLAN.md) (the intended design) and [`DECISIONS.md`](./DECISIONS.md) (why). This file describes the system **as built**.

## Request flow

```
Browser ──► proxy (src/proxy.ts) ──► Next.js route ──► server-only Data Access Layer ──► PostgreSQL
              │                         │
              │ /studio/*: session +     │ Public pages: static shell + "use cache" data, invalidated by tag
              │ role check → 403 early   │ Personal parts: request-time, inside <Suspense>, never shared-cached
              │ /stories|category|…/:x:  │ Studio: request-time, every action re-checks permissions
              │ unknown address → 404    │
```

| Layer | Where | Notes |
|---|---|---|
| Proxy | `src/proxy.ts` | Node.js runtime. Studio: redirects signed-out visitors, forces first-sign-in setup, returns a real 403 for missing permissions (`src/server/auth/studio-routes.ts`). Public dynamic routes: real 404 for unknown slugs using an in-memory address index refreshed every minute and on a miss (`src/server/route-index.ts`). |
| Pages | `src/app/(site)`, `src/app/(auth)`, `src/app/studio/(app)`, `src/app/studio/(editor)`, `src/app/studio/(setup)` | Route groups give each area its own chrome: publication header/footer, minimal auth layout, Studio sidebar, distraction-free editor. |
| Public reads | `src/server/content/public.ts`, `search.ts`, `pages.ts`, `homepage.ts`, `src/server/settings.ts` | `"use cache"` + `cacheTag`. Cache lifetime ends exactly when the next scheduled story is due (`applyScheduleAwareLife`). Never selects the protected body (unit-tested). |
| Protected read | `src/server/content/protected.ts` | The only reader of a premium story's full body; checks the session and entitlement at request time. |
| Writes | Server Actions in `src/app/actions/*` (readers) and `src/app/studio/actions/*` (staff) | Zod validation, `assertPermission()`, audit log, `updateTag()` to refresh public caches. |
| Auth | `src/server/auth/*` | Better Auth with Drizzle adapter; Argon2id; email verification required; TOTP 2FA + encrypted recovery codes; breached-password check (production); rate limits in Postgres; account lockout after 8 failures in 15 minutes; IPs stored only as salted hashes. |
| Content pipeline | `src/lib/editor/render.ts` → `src/server/content/derive.ts` | TipTap JSON (source of truth) → escaped HTML (only known nodes) → `sanitize-html` allowlist (defence in depth) → preview/body split at the members line → search text (preview only for premium) → word count and reading time. |
| Media | `src/server/media/*`, `/api/media/upload` | Sniff by magic bytes → decode → auto-rotate → re-encode (EXIF/GPS dropped) → WebP 480–2400 + AVIF 960/1600 → 24 px blurred placeholder. Stored in R2 (production) or `.local-media` (development). |
| Email | `src/server/email/*` | Every email is a row in `email_outbox` (idempotency key, priority, retries with backoff, suppression list), sent within the daily allowance (Resend free: 100/day), transactional first. |
| Jobs | `/api/cron/tick` → `src/server/jobs.ts` | Finalises due scheduled stories, drains the outbox, deletes stale rate-limit rows, sessions and tokens. Idempotent. Called every minute by cron-job.org and hourly by GitHub Actions. |
| Analytics | `/api/analytics/beacon` | Cookie-free first-party events (view, read complete, share, search) with a daily-rotating visitor hash. GA4 is separate and consent-gated. |

## Key properties and how they are guaranteed

| Property | Mechanism | Evidence |
|---|---|---|
| Premium text never reaches the unentitled | Preview/body split on save; public DAL can't select the body; continuation renders at request time; search indexes preview only | `tests/e2e/premium-canary.spec.ts` (4 personas + cache-poisoning check), `tests/unit/public-columns.test.ts` |
| Scheduling exact to the minute without a job | "Live" = published OR scheduled-and-due, evaluated in SQL; caches expire at the next due time | `tests/e2e/scheduling.spec.ts` |
| Server-side permissions | `permissions.ts` matrix; proxy + `requireStaff()` + `assertPermission()` | `tests/unit/permissions.test.ts` (every cell), `tests/e2e/permissions.spec.ts` (every role, real HTTP status) |
| Accessible in every theme | Token contrast proven in CI; axe on 13 pages × 3 themes | `pnpm check:contrast`, `tests/e2e/a11y.spec.ts` |
| Stories published after a deploy work | `instant = false` on dynamic public routes (blocking first render, then cached) | `tests/e2e/publishing.spec.ts`, `scheduling.spec.ts` |

## Data model

See `src/server/db/schema.ts` (commented) and `drizzle/0000_init.sql`. 46 tables. Money is stored in minor units (`bigint`), times in UTC (`timestamptz`), IPs only as salted hashes, primary keys are UUID v7.

## Phase 4 expansion: where it fits

The blueprint (§11) lists features for later. None are built; the structure for each is already in place:

| Future feature | What already exists |
|---|---|
| Guest writers, multiple authors per story | `post_authors` (many-to-many with order), `authors.is_guest`, `author` role with submit-for-review workflow |
| Audio storytelling, spoken word | `posts.audio_url`; the renderer reserves an `audio` node type; `media` + `MalwareScanner` interface for non-image uploads (ADR-006) |
| Downloadable publications, digital magazines | `posts.download_media_id`, `collections` (ordered via `collection_posts`), `collections.visibility` for members-only collections |
| Per-collection or tiered access | `entitlements.scope` (today `"premium"`; can be `"collection:<id>"`) |
| Reader communities, discussions | `comments` (with `parent_id`), `comment_reports`, `blocked_commenters`, `moderator` role |
| Personalised recommendations | `reading_history`, `reactions`, `bookmarks`, `analytics_events` per post |
| Mobile app | All reads go through the DAL; adding JSON route handlers or a Better Auth bearer plugin is additive |
| Advertising, partnerships | `homepage_slots` sections and `feature_flags` |
