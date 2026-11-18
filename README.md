# Inkinspire

A literary publication and its command centre, in one codebase: **the Publication** (the public reading site) and **Inkinspire Studio** (`/studio`), where the owner, Sylvia Simon ("Xenia, the Storyteller"), runs everything without a developer.

> **Status (November 2026):** Phase 0 (foundation) and Phase 1 (launch: public site, editor, Studio core) are built and tested, along with parts of Phase 2: reader accounts, bookmarks, history and newsletter double opt-in. Comments, newsletter sending and payments (Phase 3) are not built yet. See [`docs/QA-REPORT.md`](docs/QA-REPORT.md) for exactly what is proven and what isn't.

## What's inside

- **Reading:** typeset poetry (verse blocks keep line breaks, stanzas and indents, and wrap with hanging indents on phones), drop caps, epigraphs, pull quotes, ornamental breaks; Light / Sepia / Dark themes; five text sizes; serif or sans; focus mode; reading progress; resume where you left off.
- **Writing:** a quiet editor with literary blocks, a slash menu, autosave that tolerates going offline, version history with differences and one-click restore, a pre-publish checklist, Google and social-card previews, scheduling to the minute, and Markdown/JSON import and export.
- **Premium protection:** the protected part of a members' story is never sent to someone who isn't entitled to it, in the HTML, the page data, search, RSS, sitemaps or share images. A canary test proves this on every push.
- **Studio:** overview and charts, stories, calendar, media, themes/series/tags, authors, homepage curation with drag and drop, pages (About and legal templates), inbox, settings and team, security, activity log, and a command palette (⌘/Ctrl+K).
- **Built on free plans:** Vercel Hobby, Neon, Cloudflare R2, Resend, Turnstile and GA4 all start at ₦0. See [`docs/DECISIONS.md`](docs/DECISIONS.md) (ADR-002 to ADR-008) for the trade-offs and the one upgrade needed before payments go live.

## Run it locally

Requirements: Node 22+, pnpm 10, PostgreSQL 16.

```bash
pnpm install
```

```bash
cp .env.example .env
```

Fill in `BETTER_AUTH_SECRET`, `HASH_SALT` and `CRON_SECRET` (the file explains how to generate each), then:

```bash
pnpm db:migrate && pnpm db:seed
```

```bash
pnpm dev
```

The seed prints a one-time owner password. Sign in at <http://localhost:3000/login>; you'll be asked to choose your own password and set up two-step verification before the Studio opens. Emails (verification links, resets) are printed in the terminal until a Resend key is added.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Develop, build, serve |
| `pnpm db:migrate` | Apply database migrations (safe on every deploy) |
| `pnpm db:seed` | Categories, pages, homepage layout and demo stories (idempotent) |
| `pnpm demo:remove` | Remove all demo content (also a button in Studio › Settings) |
| `pnpm owner:create --email … --name …` | Create the production owner account (one-time password) |
| `pnpm test` | Unit tests (permissions matrix, workflow, renderer, contrast, …) |
| `pnpm test:e2e` | End-to-end tests on a fresh test database (canary, permissions, publishing, scheduling, accessibility) |
| `pnpm tokens` / `pnpm check:contrast` | Regenerate design tokens / prove WCAG AA for every colour pair |
| `pnpm screenshots /path …` | Screenshots at 360–1440 px in all three themes |

## Documentation

[`PLAN`](docs/PLAN.md) · [`DECISIONS`](docs/DECISIONS.md) · [`TRACEABILITY`](docs/TRACEABILITY.md) · [`ARCHITECTURE`](docs/ARCHITECTURE.md) · [`SECURITY`](docs/SECURITY.md) · [`RUNBOOK`](docs/RUNBOOK.md) · [`OWNERSHIP-HANDOVER`](docs/OWNERSHIP-HANDOVER.md) · [`LAUNCH-CHECKLIST`](docs/LAUNCH-CHECKLIST.md) · [`ADMIN-GUIDE`](docs/ADMIN-GUIDE.md) · [`QA-REPORT`](docs/QA-REPORT.md) · requirements: [`blueprint.md`](docs/blueprint.md), [`BUILD-BRIEF.md`](docs/BUILD-BRIEF.md)

## Stack

Next.js 16 (App Router, React Server Components, Cache Components) · TypeScript strict · Tailwind CSS 4 with design tokens · PostgreSQL + Drizzle ORM · Better Auth (Argon2id, email verification, TOTP) · TipTap 3 · sharp · Resend through an outbox · Paystack (Phase 3) · Vitest, Playwright, axe-core.
