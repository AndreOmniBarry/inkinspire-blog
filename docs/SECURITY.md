# Security

Threat model, controls, an OWASP Top 10 self-review, and known exceptions. Report vulnerabilities to the owner's contact email; please don't open public issues for them.

## What we protect

| Asset | Why it matters |
|---|---|
| Members-only text | Paid content; the business model (blueprint §7.6) |
| Studio access | Anyone inside can publish under the owner's name |
| Reader data | Emails, reading history, consent records (NDPA 2023, GDPR) |
| Payment integrity (Phase 3) | Access must follow money exactly |
| Availability and backups | The archive is irreplaceable |

## Threats and controls

| Threat | Controls |
|---|---|
| Reading premium text without paying | Body rendered only at request time after an entitlement check; absent from HTML, RSC payload, search, RSS, sitemap, OG images, JSON-LD; caches never hold personal output. **Canary test in CI.** |
| Studio account takeover | Argon2id (m=46 MiB, t=1); minimum 10 characters + common-password list + Have I Been Pwned range check (production); **mandatory TOTP for every Studio role** with encrypted recovery codes; sign-in rate limit (5/min/IP); account lockout (8 failures/15 min); no account enumeration; sessions in HttpOnly, SameSite=Lax, Secure cookies; sessions revoked on password change/reset; device list with sign-out. |
| Privilege escalation | Permission matrix enforced in the proxy, in every page (`requireStaff`) and in every action (`assertPermission`); authors can't edit stories once they are with the editor; role changes owner-only and audited. |
| Cross-site scripting | Editor output rendered from JSON by an escaping renderer that emits only known nodes, then an allowlist sanitiser; links limited to http(s)/mailto/tel/relative; search highlights escaped before marks are added; JSON-LD escapes `<`; CSP (ADR-007). |
| CSRF | Better Auth origin checks; Server Actions require same-origin POST with an action id; SameSite cookies. |
| Malicious uploads | Images only; type by magic bytes; 15 MB / 50 MP limits; full decode and re-encode (EXIF/GPS dropped); served with fixed image content types, `nosniff` and `default-src 'none'`; never from an executable path (ADR-006). |
| SSRF (link checker) | Public hostnames only; private, loopback, link-local and numeric hosts refused; 5-second timeout. |
| Spam and abuse | Turnstile (when keys are set), honeypot and timing fields, Postgres-backed rate limits on newsletter, contact, bookmarks, reactions, uploads and the analytics beacon. |
| Open redirects | `safeNext()` allows only same-site relative paths after sign-in. |
| Data exposure | IPs stored only as salted hashes; minimal data collection; "Download my data" and "Delete my account" for readers; audit log for staff actions. |
| Secrets leakage | Secrets only in environment variables, validated at start-up (`src/server/env.ts`); production refuses the development auth secret; `.env*` git-ignored. |
| Loss of data | Neon point-in-time recovery + nightly `age`-encrypted dump to R2 (30 daily, 12 monthly); restore drill recorded in `RUNBOOK.md`. |

## Security headers

Set in `next.config.ts` for every response: `Content-Security-Policy`, `Strict-Transport-Security` (2 years, preload), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` with `frame-ancestors 'self'` (the Studio previews the homepage in a same-site frame), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation off), `Cross-Origin-Opener-Policy`. Studio and account pages also send `X-Robots-Tag: noindex`.

## OWASP Top 10 (2021) self-review, November 2026

| Risk | Status | Notes |
|---|---|---|
| A01 Broken access control | Mitigated | Matrix + proxy + page + action checks; e2e verifies real 403s for each role; premium canary. |
| A02 Cryptographic failures | Mitigated | Argon2id; TOTP secrets and recovery codes encrypted with the auth secret; TLS via host + HSTS; no card data ever (hosted checkout, Phase 3). |
| A03 Injection | Mitigated | Drizzle parameterised queries; raw SQL only via tagged templates with bound parameters; Zod on every action and route. |
| A04 Insecure design | Mitigated | Threat model above; content split at save time; outbox for email; idempotent jobs. |
| A05 Security misconfiguration | Mitigated, one exception | Strict headers; `poweredByHeader` off; env validation. **Exception:** CSP allows `'unsafe-inline'` scripts (ADR-007). |
| A06 Vulnerable components | Mitigated | `pnpm audit --audit-level high` in CI; Dependabot weekly. Exceptions below. |
| A07 Identification and authentication failures | Mitigated | See "Studio account takeover". |
| A08 Software and data integrity | Mitigated | Lockfile with `--frozen-lockfile` in CI; webhook signature verification is specified for Phase 3 (HMAC-SHA512, constant time, raw body). |
| A09 Logging and monitoring | Partly | Audit log and login history in the Studio. **Gap:** no external error alerting yet (free option: Sentry's free plan); listed in the launch checklist. |
| A10 SSRF | Mitigated | Link checker host restrictions. |

## Accepted dependency advisories

`pnpm audit` reports two advisories, ignored in `package.json` (`pnpm.auditConfig.ignoreGhsas`) after review:

| Advisory | Package | Why it is not exploitable here |
|---|---|---|
| GHSA-fc5q-39xc-vjpf (high, ReDoS) | `picomatch` ≤ 4.0.7, via `better-auth > vitest` | Pulled in through Better Auth's optional test-runner peer; never runs in the deployed site. No patched version exists yet. Remove the ignore when one ships. |
| GHSA-67mh-4wv8-2f99 (moderate) | `esbuild` ≤ 0.24.2, via `better-auth > drizzle-kit` | Development-server issue in a migration tool; not part of the deployed site. |

## Known gaps (tracked in the launch checklist)

- Malware scanning for non-image uploads is not needed yet (image-only uploads), but must be configured before audio/PDF uploads (ADR-006).
- External error alerting is not configured.
- Paystack webhook handling (Phase 3) is not built; its rules are specified in the build brief §7.3.
