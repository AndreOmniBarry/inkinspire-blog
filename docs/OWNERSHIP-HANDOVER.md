# Ownership handover

Blueprint §8.1, §14 and §16: the owner must control every account and asset. Every service below is created **with the owner's email, in the owner's name**, and the developer is added as a *member* who can be removed at any time. Tick each line during handover.

| # | Asset | How it is created in her name | Developer access | Cost now | Done |
|---|---|---|---|---|---|
| 1 | **Domain** (e.g. inkinspire.com) | Registered by the owner at a registrar she logs into (Cloudflare Registrar sells at cost; Namecheap and Whogohost also work). Registrant name and email: hers. Turn on auto-renew and registrar lock. | Only DNS editing, via Cloudflare DNS member access, if needed | ≈ ₦15–25k/year (the only unavoidable cost) | ☐ |
| 2 | **Source code** (GitHub) | The repository lives under her GitHub account or an organisation she owns. | Collaborator, removable | Free | ☐ |
| 3 | **Hosting** (Vercel) | Her Vercel account (sign in with her GitHub). | Team member (Pro) or temporary password sharing via a password manager (Hobby) | Free until payments go live (ADR-002) | ☐ |
| 4 | **Database** (Neon) | Her Neon account; project owner = her. | Organisation member | Free | ☐ |
| 5 | **Media and backups** (Cloudflare R2) | Her Cloudflare account; buckets `inkinspire-media`, `inkinspire-backups`. | Member with R2 access only | Free up to 10 GB | ☐ |
| 6 | **Backup decryption key** (`age`) | Generated on **her** computer; private key kept offline by her only. | None. The developer never holds it. | Free | ☐ |
| 7 | **Email** (Resend) | Her Resend account; domain verified under it. | Team member | Free up to 100/day | ☐ |
| 8 | **Payments** (Paystack) | Her Paystack business account, KYC in her name, payouts to her bank account. | Developer role (test keys only) | No monthly fee; per-transaction fees | ☐ |
| 9 | **Analytics** (GA4, Search Console) | Her Google account owns both properties. | "Viewer"/"Restricted" user | Free | ☐ |
| 10 | **Spam protection** (Cloudflare Turnstile) | Her Cloudflare account. | As above | Free | ☐ |
| 11 | **Scheduler** (cron-job.org) | Her account. | None needed | Free | ☐ |
| 12 | **Studio owner account** | Created with `pnpm owner:create --email <hers>`; she sets her own password and 2FA on first sign-in. | Separate admin or editor account, removable in Studio › Settings › Team | Free | ☐ |
| 13 | **Brand assets** | Logo geometry in `src/components/brand/logo-data.ts`; the logo is a strong placeholder until she approves one. Fonts are open-licence (SIL OFL). | — | — | ☐ |
| 14 | **Content** | All stories are hers. Every story exports as Markdown and JSON (editor › More), and the whole database is in her nightly backups. | — | — | ☐ |

## At handover

1. Owner changes every password and turns on 2FA on every account above.
2. Owner removes any developer access she no longer wants (Studio › Settings › Team; each provider's members page).
3. Rotate `BETTER_AUTH_SECRET`, `CRON_SECRET`, R2 and Resend keys; update them in the host.
4. Developer hands over: this repository, the runbook, the admin guide, and confirms in writing that no copies of keys or data are retained.
