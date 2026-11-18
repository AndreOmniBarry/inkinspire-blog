# Runbook

How to deploy, schedule jobs, back up, restore, roll back and handle incidents. Written so a developer the owner hires later can follow it without asking anyone.

## 1. First deployment (free plans)

All accounts are created **in the owner's name** (see `OWNERSHIP-HANDOVER.md`).

1. **Database (Neon, free):** create a project in region *Europe (Frankfurt)* (closest to Lagos with good peering). Copy the **pooled** connection string (`…-pooler…`, `?sslmode=require`) for the app, and the **direct** one for backups.
2. **Images (Cloudflare R2, free 10 GB):** create bucket `inkinspire-media`; connect a custom domain such as `media.inkinspire.com` (Settings › Public access); create an API token with Object Read & Write for that bucket. Create a second, private bucket `inkinspire-backups`.
3. **Email (Resend, free 100/day):** add and verify the domain (SPF, DKIM and the DMARC record in §6); create an API key.
4. **Hosting (Vercel Hobby, free; non-commercial, see ADR-002):** import the GitHub repository. Set every variable from `.env.example` (Production and Preview). Build command `pnpm build`; install `pnpm install --frozen-lockfile`. Vercel does not run migrations; run them from your computer (or a CI job) against the **direct** connection string before the first deploy, and whenever `drizzle/` changes:

   ```bash
   DATABASE_URL="<direct neon url>" pnpm db:migrate
   ```

   ```bash
   DATABASE_URL="<direct neon url>" NODE_ENV=production pnpm db:seed --no-owner
   ```

   ```bash
   DATABASE_URL="<direct neon url>" pnpm owner:create --email <owner email> --name "Sylvia Simon"
   ```

5. **Domain:** add it in Vercel; HTTPS is automatic. Set `SITE_URL` to `https://<domain>` and redeploy.
6. **Minute job (cron-job.org, free):** create a job: URL `https://<domain>/api/cron/tick`, every minute, header `Authorization: Bearer <CRON_SECRET>`, "save responses" off. GitHub Actions also calls it hourly as a backup (`.github/workflows/scheduled.yml`; set `SITE_URL` and `CRON_SECRET` repository secrets).
7. **Spam protection (optional):** Cloudflare Turnstile → add site → set both keys.
8. **Search Console:** add the domain property, choose *HTML tag*, put the code in `GOOGLE_SITE_VERIFICATION`, redeploy, verify, then submit `https://<domain>/sitemap.xml`.

### Moving to a commercial plan (before Paystack live keys)

Either upgrade the Vercel project to **Pro** (no code change), or run the Docker image on **Google Cloud Run** (free tier allows commercial use; needs a billing card on file):

```bash
gcloud run deploy inkinspire --source . --region europe-west1 --allow-unauthenticated --set-env-vars-file env.yaml
```

The Dockerfile builds the standalone server; the build reads the database (public pages are prerendered), so pass `DATABASE_URL` as a build argument. Verify current free-tier terms on the provider's pricing page first.

## 2. Every deploy

CI (`.github/workflows/ci.yml`) must be green: tokens and contrast, lint, types, unit tests, dependency audit, build, and the end-to-end suite including the premium canary. Then:

1. If `drizzle/` changed, run `pnpm db:migrate` against the direct connection **before** promoting the deploy. Migrations are additive by convention (add columns, never rename in place).
2. Promote. Public caches refresh by tag on the next request.

## 3. Rollback

- **Code:** Vercel › Deployments › previous deployment › *Promote*. Docker: redeploy the previous image tag.
- **Database:** never roll back the schema by hand. Ship a new forward migration. For bad *data*, restore to a branch (below) and copy back what's needed.

## 4. Backups

| Layer | What | Retention |
|---|---|---|
| Neon | Point-in-time restore (free plan: a short history window; check current limit) | Provider |
| Nightly job | `scripts/backup.sh` via `.github/workflows/scheduled.yml`: `pg_dump` (custom format) → encrypted with `age` to the owner's public key → R2 `inkinspire-backups` | 30 daily + 12 monthly |
| Media | R2 bucket (durable); enable R2 object versioning for extra safety | Provider |

Generate the backup key once, on the owner's computer, and keep `key.txt` **offline** (a password manager attachment and a USB stick):

```bash
age-keygen -o inkinspire-backup-key.txt
```

Put the printed public key (`age1…`) in the `BACKUP_AGE_RECIPIENT` repository secret. The server can encrypt backups but can never decrypt them.

## 5. Restore

```bash
aws s3 cp s3://inkinspire-backups/daily/<file>.dump.age . --endpoint-url https://<account>.r2.cloudflarestorage.com
```

```bash
createdb inkinspire_restore
```

```bash
age -d -i inkinspire-backup-key.txt <file>.dump.age | pg_restore --no-owner -d inkinspire_restore
```

Check it (row counts, open a story), then either point `DATABASE_URL` at the restored database (Neon: restore into a new branch, then promote it) or copy the needed rows back.

### Restore drill: recorded

| Date | What | Result |
|---|---|---|
| 18 Nov 2026 | Full drill on the development machine against the end-to-end database (18 stories, 8 users, 25 revisions, 7 pages): `pg_dump -Fc` → `age` encrypt (155 KB) → decrypt → `pg_restore` into a new database | **Passed.** Restore took ~1 s. Row counts identical on posts, users, categories, revisions, pages, media and audit log; full-text search worked on the restored copy. |

**Repeat this drill against production after launch, and every quarter** (add a row here each time).

## 6. Email DNS (for the owner's domain)

Add the SPF and DKIM records Resend shows for the domain, then DMARC. Start in monitoring mode, then tighten after two clean weeks:

| Type | Name | Value |
|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:<owner email>; fo=1` |
| TXT | `_dmarc` (after 2 weeks) | `v=DMARC1; p=quarantine; rua=mailto:<owner email>` |

## 7. Incidents

| Symptom | First steps |
|---|---|
| Site down | Check the host's status page and the latest deploy; promote the previous deployment; check Neon status and compute-hour usage (free plan suspends at the limit). |
| Emails not arriving | Studio › Settings › Connected services; Resend dashboard (daily limit reached? domain unverified?); `email_outbox` rows with `status = 'failed'` show the error. |
| Scheduled story late | It can't be late: visibility is computed from its time. If the "new story" email is late, the minute job isn't running: check cron-job.org history and `/api/cron/tick` with the bearer secret. |
| Suspected premium leak | Run `pnpm test:e2e` (canary); check recent changes to `src/server/content/public.ts`; purge caches by redeploying. |
| Suspected account compromise | Studio › Security › sign out other devices; change password (revokes all sessions); check the activity log; rotate `BETTER_AUTH_SECRET` to sign everyone out (also resets everyone's 2FA, so staff must re-enrol). |

### Owner locked out (lost phone and recovery codes)

Only someone with database access can do this, and it must be audited:

```sql
update users set two_factor_enabled = false where email = '<owner email>';
delete from two_factors where user_id = (select id from users where email = '<owner email>');
insert into audit_log (id, actor_label, action, summary) values (gen_random_uuid(), 'operator', 'account.2fa_reset', '2FA reset for <owner email> after identity check');
```

On next sign-in the owner is sent to set up two-step verification again.
