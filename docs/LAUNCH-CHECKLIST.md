# Launch checklist: things only the owner can do

Each item is a decision or an account that must be hers. My recommendation is in the right-hand column.

| # | Item | Why it's yours | Recommendation |
|---|---|---|---|
| 1 | **Approve the technology** (ADR-001) | Blueprint §13: the stack needs her approval | A purpose-built Next.js platform rather than WordPress/Ghost (Ghost can't take Paystack memberships). |
| 2 | **Buy the domain** | Must be registered in her name (§8.1) | `inkinspire.com` if available; Cloudflare Registrar (at-cost renewals). |
| 3 | **Create the free accounts** in her name | Ownership (§16) | GitHub, Vercel, Neon, Cloudflare (R2, Turnstile), Resend, Google (GA4, Search Console), cron-job.org. Steps in `RUNBOOK.md` §1. |
| 4 | **Approve the logo** | Brand identity (§2.2) | The current ink-drop-and-nib mark with a Fraunces wordmark is a strong placeholder. Replace `src/components/brand/logo-data.ts`, or upload in Studio › Settings once that upload is added. |
| 5 | **Replace the About text and author bio** | Her voice | Studio › Pages › About and Studio › Authors. |
| 6 | **Have a lawyer review the six legal templates** | They are templates, not legal advice | Studio › Pages shows "Template: needs legal review" until each is saved. NDPA 2023 compliance: consider registering with the NDPC if she processes data of 200+ people in six months. |
| 7 | **Remove the demo content** | The 12 demo stories are labelled samples | Studio › Settings › Demo content › Remove (or `pnpm demo:remove`). Do this right before publishing her first stories. |
| 8 | **Set the social links and contact email** | Her accounts | Studio › Settings. |
| 9 | **Choose membership prices** (Phase 3) | Commercial decision | Start with one monthly and one yearly plan in Naira (e.g. ₦2,000/month, ₦20,000/year, two months free). Confirm USD support with Paystack before offering it. |
| 10 | **Paystack: complete business verification, test in sandbox, then switch to live keys** | Money and KYC are hers (§7.5, §15) | Only after the full sandbox lifecycle passes (Phase 3 gate). |
| 11 | **Move hosting to a plan that allows commercial use** before live payments | Vercel Hobby is non-commercial (ADR-002) | Vercel Pro (simplest) or Google Cloud Run free tier (cheapest; slightly more technical). |
| 12 | **Generate and keep the backup key** | Only she should be able to decrypt backups | `age-keygen` on her computer; store the private key offline (`RUNBOOK.md` §4). |
| 13 | **Set up error alerting** (optional, free) | So someone knows if the site breaks | Sentry's free plan, alerts to her email. |
| 14 | **Hire or nominate someone for quarterly checks** | Restore drill, dependency updates | 30 minutes a quarter: run the restore drill, merge Dependabot updates. |
