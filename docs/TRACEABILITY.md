# Traceability: blueprint → implementation → evidence

Every section and bullet of [`blueprint.md`](./blueprint.md) mapped to where it is built and how it is proven. **Status** is updated as work lands: `Planned`, `Built`, `Verified` (evidence exists).

| § | Requirement | Implementation | Evidence | Phase | Status |
|---|---|---|---|---|---|
| 1.1 | Professional digital storytelling & literary publication | Whole product | — | P1 | Planned |
| 1.2.1 | Professional digital identity | Logo system `src/components/brand/`, tokens | Visual review | P1 | Planned |
| 1.2.2 | Central platform for publishing & archiving | Posts + archive status | e2e publish flow | P1 | Planned |
| 1.2.3 | Clearly defined categories | `categories` table, `/category/[slug]` | e2e categories | P1 | Planned |
| 1.2.4 | Excellent reading on all devices | Article template, reading controls | Screenshot matrix, Lighthouse | P1 | Planned |
| 1.2.5 | Engagement & returning visits | Bookmarks, history, newsletter, related | e2e engagement | P2 | Planned |
| 1.2.6 | Free and premium content | `posts.visibility`, paywall node, entitlements | Canary test | P1/P3 | Planned |
| 1.2.7 | Paid subscriptions & secure payments | Paystack provider, state machine | Sandbox lifecycle | P3 | Planned |
| 1.2.8 | Newsletter & automated email | Outbox, templates | e2e newsletter | P2 | Planned |
| 1.2.9 | Manage without programming | Studio | Admin guide walkthrough | P1 | Planned |
| 1.2.10 | Room for expansion | Reserved schema (ARCHITECTURE.md) | Review | P0 | Planned |
| 2.1 | Classic, sophisticated, minimalist, editorial | Design tokens, typography | Design review screenshots | P0/P1 | Planned |
| 2.2 | Logo | SVG wordmark + mark, favicon, app icons, OG template | Visual | P1 | Planned |
| 2.2 | Consistent colour palette | `src/styles/tokens.css` | `pnpm check:contrast` | P0 | Planned |
| 2.2 | Elegant typography | Fraunces / Newsreader / Instrument Sans | Visual | P0 | Planned |
| 2.2 | White space, well-defined sections | Spacing scale tokens, layout primitives | Visual | P0 | Planned |
| 2.2 | High-quality editorial imagery | Media pipeline (AVIF/WebP, blurhash), typographic covers | Unit + visual | P1 | Planned |
| 2.2 | Consistent buttons and icons | `src/components/ui/` | Visual | P0 | Planned |
| 2.2 | Subtle animations & transitions | CSS transitions, View Transitions, reduced-motion | axe + manual | P1 | Planned |
| 2.3 | Heading font, readable body, hierarchy, spacing, line height | Type scale tokens, `.prose-ink` | Visual | P0 | Planned |
| 2.4 | Responsive: Android, iPhone, tablet, laptop, desktop | Mobile-first CSS | Screenshots 360/390/768/1024/1440 × 3 themes | P1 | Planned |
| 3.1 | Homepage: header, logo, hero, featured, editor's picks, latest, popular, categories, author intro, newsletter, premium invite, footer | `src/app/(site)/page.tsx`, `homepage_slots` | e2e home | P1 | Planned |
| 3.1 | Admin updates featured without developer | Studio › Homepage | e2e curation | P1 | Planned |
| 3.2 | About page: story, purpose, mission, content, team | `pages` (editable), `/about` | e2e pages | P1 | Planned |
| 3.3 | Stories: grid/list, filter, sort, search, premium/free marks, dates, reading time, pagination | `/stories` | e2e stories | P1 | Planned |
| 3.4 | Article: title, cover, author, date, reading time, content, headings, sharing, bookmark, related, bio, comments, premium restriction, uncluttered | `/stories/[slug]` | e2e article, canary | P1/P2 | Planned |
| 3.5 | Category pages + 8 initial categories | `/category/[slug]`, seed | e2e | P1 | Planned |
| 3.5 | Create, rename, edit, delete categories | Studio › Taxonomy (safe re-assign) | e2e taxonomy | P1 | Planned |
| 3.6 | Author page: photos, bio, description, articles, socials | `/authors/[slug]` | e2e | P1 | Planned |
| 3.7 | Contact: form, email, socials, collaboration, spam protection | `/contact`, Turnstile, honeypot, rate limit | e2e contact | P1 | Planned |
| 3.8 | Privacy, Terms, Cookies, Copyright, Subscription Terms, Refund & Cancellation | `/legal/[slug]` (editable templates) | e2e crawl | P1 | Planned |
| 4.1 | Create, edit, delete, drafts, schedule, publish now | Studio › Write / Library | e2e publish | P1 | Planned |
| 4.1 | Upload & manage images | Studio › Media | e2e media | P1 | Planned |
| 4.1 | Format articles | TipTap editor + literary nodes | Unit (renderer) + e2e | P1 | Planned |
| 4.1 | Categories & tags; featured; free/premium; titles & descriptions; authors | Editor side panel, Library toggles, Studio › Authors | e2e | P1 | Planned |
| 4.2 | Draft, Pending Review, Scheduled, Published, Archived; owner review | Workflow state machine `src/server/content/workflow.ts` | Unit (all transitions) | P1 | Planned |
| 4.3 | Categories, tags, authors, featured images, dates, SEO descriptions, reading time, visibility | `posts` columns | Unit | P1 | Planned |
| 5.1 | Registration: email, password, verification; social login optional | Better Auth, flag `social_login` | e2e auth | P2 | Planned |
| 5.2 | Reader dashboard: profile, saved, history, subscription, settings, password | `/account/*` | e2e account | P2 | Planned |
| 5.3 | Bookmarks | `bookmarks` | e2e | P2 | Planned |
| 5.4 | Search by title, keywords, categories, tags, authors | Postgres FTS + trigram | Unit + e2e | P1 | Planned |
| 5.5 | Related publications | Category/tag overlap ranking | Unit | P1 | Planned |
| 5.6 | Comments, appreciation, moderation, spam filtering, disable | `comments`, `reactions`, Studio › Comments | e2e | P2 | Planned |
| 5.7 | Progress indicator, text size, dark/light, reading time, distraction-free | Reading controls + focus mode | e2e reading controls | P1 | Planned |
| 6.1 | Newsletter signup on homepage & article pages | Double opt-in | e2e newsletter | P2 | Planned |
| 6.2 | Welcome, verification, new publication, newsletter, subscription confirmation, receipts, renewal reminder, expiry, password reset | React Email templates via outbox | Unit (render) + e2e | P2/P3 | Planned |
| 6.2 | Unsubscribe from marketing | List-Unsubscribe headers + link | e2e | P2 | Planned |
| 7.1 | Free membership capabilities | Reader role, free entitlements | Permissions matrix | P2 | Planned |
| 7.2 | Premium: exclusive stories, reflections, members-only, collections, premium newsletters | Entitlements + visibility | Canary | P3 | Planned |
| 7.3 | Configurable plans: price, duration, benefits, access, renewal; monthly/yearly | `plans`, Studio › Memberships | e2e | P3 | Planned |
| 7.4 | Select plan, pay, confirmation, access, status, renew, cancel, update info | Checkout + `/account/billing` | Sandbox lifecycle | P3 | Planned |
| 7.5 | Investigate Paystack/Flutterwave (NG, international, recurring, confirmation, verification, refunds, failures); never store card data | `docs/PAYMENTS.md`, provider layer | Doc + unit | P3 | Planned |
| 7.6 | Premium protected against URL manipulation/page source; free, premium, previews, subscription access, expired restrictions | Protected DAL, Suspense continuation | Canary (4 personas) | P1/P3 | Planned |
| 8.1 | Custom domain in owner's name | OWNERSHIP-HANDOVER.md | Checklist | P4 | Planned |
| 8.2 | Hosting: uptime, performance, storage, SSL, backups, security, scalability | ADR-002/003, RUNBOOK | Restore drill | P4 | Planned |
| 8.3 | HTTPS | HSTS, platform TLS | Header test | P0 | Planned |
| 8.4 | Optimise images, loading, caching, DB, scripts, response times | Cache Components, sharp, indexes | Lighthouse CI | P1 | Planned |
| 8.5 | SEO titles, meta, URLs, sitemap, alt text, headings, internal links, canonical, structured data | `generateMetadata`, sitemap, JSON-LD | Unit + Lighthouse SEO | P1 | Planned |
| 8.6 | GA4, Search Console, admin monitors activity | Consent-gated GA4, first-party analytics | e2e consent | P1 | Planned |
| 9.1 | Secure administrator login | Better Auth, Argon2id, lockout | Security tests | P0/P1 | Planned |
| 9.2 | Strong password policies | Length + breached-password check | Unit | P1 | Planned |
| 9.3 | 2FA for administrative accounts | Mandatory TOTP for Studio roles | e2e | P1 | Planned |
| 9.4 | Spam protection | Turnstile, honeypot, rate limits, comment scoring | Unit | P1 | Planned |
| 9.5 | Regular security updates | Dependabot + `pnpm audit` in CI | CI | P0 | Planned |
| 9.6 | Automated backups | Nightly encrypted dump to R2 | Restore drill | P4 | Planned |
| 9.7 | Malware protection | ADR-006 | Unit (upload validation) | P1 | Planned |
| 9.8 | Secure payment processing | Hosted checkout, signed webhooks, idempotency | Unit | P3 | Planned |
| 9.9 | Protection against unauthorised access | Server-side permission matrix | Permissions matrix test | P1 | Planned |
| 9.10 | Secure handling of reader information | Hashed IPs, export/delete | e2e | P2 | Planned |
| 9 | Privacy disclosures & consent | Cookie banner, consent log | e2e | P1 | Planned |
| 10 | Dashboard: publications, drafts, readers, premium, active/expired subs, newsletter, payments, activity | Studio › Overview | e2e | P1/P3 | Planned |
| 10 | Controls: content, readers, memberships, payments, categories, newsletter, comments, settings | Studio modules | e2e | P1–P3 | Planned |
| 10 | Role-based permissions | `src/server/auth/permissions.ts` | Permissions matrix test | P0/P1 | Planned |
| 11 | Expansion: guest writers, multiple authors, magazines, downloads, audio, interviews, community, recommendations, app, partnerships, ads | Reserved schema + ARCHITECTURE.md | Review | P4 | Planned |
| 12 | Phases One–Four | PLAN.md §4 | Gates | — | Planned |
| 13 | Stack proposed and approved by owner | ADR-001 (pending approval) | Owner sign-off | P0 | Planned |
| 14.46–60 | Deliverables: site, responsive UI, dashboard, CMS, domain/hosting, SSL, payments, newsletter, SEO, security/backup, QA, training, docs, credentials, ownership | Repo + docs/* | Handover checklist | P4 | Planned |
| 15 | Acceptance criteria (17 items) + sandbox testing | QA-REPORT.md | Per item | P4 | Planned |
| 16 | Owner retains domain, hosting, admin, DB, content, brand, payments, analytics | OWNERSHIP-HANDOVER.md | Checklist | P4 | Planned |
| 17 | Not an ordinary blog; quality, usability, security, maintainability, scalability | Whole product | Design reviews | — | Planned |
