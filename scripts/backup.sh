#!/usr/bin/env bash
# Nightly encrypted, off-site database backup (ADR-003).
# pg_dump (custom format) → age encryption (public key only; the private key stays with the owner)
# → Cloudflare R2. Keeps 30 daily and 12 monthly copies. Restore steps: docs/RUNBOOK.md.
# Needs: DATABASE_URL, AGE_RECIPIENT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BACKUP_BUCKET
set -euo pipefail
stamp=$(date -u +%Y-%m-%dT%H%MZ)
day=$(date -u +%d)
file="inkinspire-${stamp}.dump.age"
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" | age -r "$AGE_RECIPIENT" > "/tmp/${file}"
size=$(stat -c %s "/tmp/${file}")
if [ "$size" -lt 1024 ]; then echo "Backup is suspiciously small (${size} bytes); refusing to upload." >&2; exit 1; fi
aws s3 cp "/tmp/${file}" "s3://${R2_BACKUP_BUCKET}/daily/${file}" --endpoint-url "$R2_ENDPOINT" --only-show-errors
if [ "$day" = "01" ]; then aws s3 cp "/tmp/${file}" "s3://${R2_BACKUP_BUCKET}/monthly/${file}" --endpoint-url "$R2_ENDPOINT" --only-show-errors; fi
# Retention
for prefix in daily:30 monthly:12; do
  p=${prefix%%:*}; keep=${prefix##*:}
  aws s3 ls "s3://${R2_BACKUP_BUCKET}/${p}/" --endpoint-url "$R2_ENDPOINT" | awk '{print $4}' | sort | head -n -"${keep}" | while read -r old; do
    [ -n "$old" ] && aws s3 rm "s3://${R2_BACKUP_BUCKET}/${p}/${old}" --endpoint-url "$R2_ENDPOINT" --only-show-errors
  done
done
echo "Backup ${file} uploaded (${size} bytes)."
