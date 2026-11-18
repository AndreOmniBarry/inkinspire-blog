# QA report

Evidence for the Definition of Done (build brief §13, blueprint §15). Every line says **how** it is proven and its **status**: ✅ proven, 🟡 partly, ⬜ not built yet (with the phase it belongs to). Last full run: **18 November 2026**.

## Test suites

| Suite | Command | Result |
|---|---|---|
| Unit (Vitest) | `pnpm test` | **287 passed**: permissions matrix (every role × every permission), publishing workflow, renderer (escaping, links, verse, paywall split, typography, Markdown round trip), search-highlight escaping, contrast for every token pair, "public modules never read the protected body", slug/diff/password/image-sniff helpers |
| End-to-end (Playwright, desktop + Pixel 7) | `pnpm test:e2e` | **21 passed**: premium canary (5), permissions per role (6), accessibility (3 themes × 13 pages), publishing from desktop and phone, author review flow, exact scheduling, reader account journey (2) |
| Token contrast | `pnpm check:contrast` | **102/102** text/background pairs pass WCAG 2.2 AA in Paper, Sepia and Midnight |
| Lint and types | `pnpm lint`, `pnpm typecheck` | Clean |
| Dependency audit | `pnpm audit --audit-level high --prod` | Clean, with two reviewed dev-only advisories (see `SECURITY.md`) |
| Lighthouse 13 (simulated mobile) | see below | Performance 95 / 98 / 99; Accessibility, Best Practices, SEO 100 on home, story and category pages |

## Definition of Done

| Requirement | Evidence | Status |
|---|---|---|
| All pages load; navigation works; no broken links | Accessibility suite loads 13 key pages in 3 themes; real 404s for unknown addresses (ADR-009). **A full-site link crawl test is not written yet.** | 🟡 |
| Correct on mobile and desktop, five breakpoints, three themes | `pnpm screenshots` captures 360–1440 px × 3 themes; reviewed for home, story, premium story, Studio (desktop and phone); publishing e2e runs on a Pixel 7 profile. Selected captures in `docs/screenshots/`. | ✅ |
| Articles created, edited, scheduled, published; scheduling fires on time | `publishing.spec.ts` (desktop + phone), `scheduling.spec.ts` (a story scheduled 5 s ahead appears on time **with no background job running**), workflow unit tests | ✅ |
| Categories created, renamed, edited, deleted safely | Studio › Themes: rename, recolour, reorder, delete with re-assignment of stories (transactional, audited). **No automated test yet.** | 🟡 |
| Search returns relevant results and never leaks premium text | Weighted FTS + trigram typo tolerance; canary test proves the protected text is not indexed; highlight escaping unit-tested | ✅ |
| Registration, email verification, login, password recovery | Built (Better Auth, verification mandatory, reset with single-use expiring tokens). Sign-in with 2FA tested end-to-end; **registration → verification link → reset are not yet automated** (the email transport records messages, so a test is straightforward). | 🟡 |
| Bookmarks and reading history | `reader.spec.ts`: save, see in account, export includes it; history recorded on scroll | ✅ |
| Newsletter double opt-in, send, one-click unsubscribe | Double opt-in, confirmation, scanner-safe unsubscribe page and RFC 8058 one-click endpoint built; List-Unsubscribe headers set in the outbox. **Composing and sending campaigns from the Studio is Phase 2.** | 🟡 |
| Premium restrictions enforced | `premium-canary.spec.ts`: anonymous, free reader, expired member never receive the canary (HTML, RSC payload, search, RSS, sitemap, homepage, stories list, share image); active member does; a member's visit doesn't poison what anonymous visitors receive | ✅ |
| Payments verified server-side; access follows renew/cancel/fail/expire | Data model, entitlements and the protected-content path are in place. **Paystack integration and the subscription state machine are Phase 3.** | ⬜ Phase 3 |
| Contact form with spam protection | Built: validation, honeypot, timing, Turnstile (when keys set), rate limit, Studio inbox, owner notification and auto-acknowledgement. **No automated test yet.** | 🟡 |
| A backup is restored successfully | Drill on 18 Nov 2026: encrypted dump → restore → identical row counts on every checked table; search works on the copy (`RUNBOOK.md` §5) | ✅ (development); repeat on production after launch |
| No critical or high security findings; dependency audit clean | OWASP self-review in `SECURITY.md`; audit clean with two documented dev-only exceptions | ✅ |
| Lighthouse budgets and Core Web Vitals; axe zero violations | Perf ≥ 95 on all three pages; LCP 0.9–1.0 s (≤ 2.0 s); CLS 0 (≤ 0.05); TBT 90–270 ms; axe 0 violations × 3 themes. **JS budget: 169 KB vs 100 KB target**: framework floor, see ADR-012. Lighthouse CI is not yet wired into the GitHub workflow. | 🟡 |
| Permissions matrix passes for every role | Unit matrix (every cell) + e2e per role with real HTTP status codes | ✅ |

## Lighthouse detail (18 Nov 2026, production build, local server, simulated mobile)

| Page | Perf | A11y | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/` | 95 | 100 | 100 | 100 | 1.0 s | 0 | 270 ms |
| `/stories/harmattan-letter` | 98 | 100 | 100 | 100 | 1.0 s | 0 | 160 ms |
| `/category/poetry-and-creative-writing` | 99 | 100 | 100 | 100 | 0.9 s | 0 | 90 ms |

Measured locally, so network latency to Vercel/Neon from Nigeria is not included; re-measure on the deployed preview.

## Bugs found by the tests (and fixed) during this build

1. Stories published after a deploy returned **500** (ADR-010).
2. The editor could not save: ProseMirror attribute objects were sent to the server as opaque references.
3. Unknown addresses returned **200** ("soft 404") and refused Studio areas returned 200 with a forbidden message (ADR-009).
4. Newsletter hint text failed contrast on the dark membership panel.
5. Story status was hidden on phones, so the owner couldn't see whether a story was live.
6. The analytics beacon could error on a deleted story's id.

## Not built yet (honest list)

| Item | Phase |
|---|---|
| Comments, moderation queue, reactions UI beyond "appreciate" | 2 |
| Newsletter composing, segments, sending, delivery stats; automated-email template editor | 2 |
| Reading preferences synced to the account (they persist per device today) | 2 |
| Quote-card sharing | 2 |
| Readers module and Analytics module in the Studio (overview charts exist) | 2 |
| Plans, Paystack checkout, webhooks, subscription state machine, Memberships and Payments modules, reconciliation, dunning, `docs/PAYMENTS.md` research | 3 |
| Logo upload in Settings (logo is replaced by one file today) | 2 |
| Maintenance mode | 2 |
| Lighthouse CI in GitHub Actions; link-crawl test; tests for registration/reset/contact/taxonomy | 2 |
| Deployed preview URL | Needs the owner's Vercel account |
