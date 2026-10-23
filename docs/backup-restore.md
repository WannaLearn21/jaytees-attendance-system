# Runbook: Backup and Restore

As far as I know, the free Supabase tier has no managed backups, so JATS makes its own. Verify this against current Supabase terms before relying on it.

## Targets (starting points)

- Lose at most **7 days** of data (weekly backup; take an extra one before every production migration).
- Restore within **1 day**.

## What is backed up

| Data | Backed up? | Notes |
| :--- | :--- | :--- |
| Database (`punches`, `profiles`, shifts, adjustments, audit log, consents) | **Yes** | This is the payroll record |
| Auth users (login identities) | Included if you dump the `auth` schema; see note | Without them, people need new PINs |
| Selfie files in Storage | **No** | They are purged after 60 days and are not the payroll record |

Note: a plain dump of `public` restores your data but not the sign-in accounts. Decide at setup time whether to also dump `auth`. If you do not, the restore plan is: recreate accounts with the account tool, then re-link the `profiles` rows. Test whichever you choose.

## Weekly backup job

Run on a schedule (GitHub Actions is a free option). Keep the connection string in repository secrets.

```bash
pg_dump "$DATABASE_URL" --format=custom --no-owner --file=jats.dump
age -r "$AGE_PUBLIC_KEY" -o jats-$(date +%F).dump.age jats.dump
# upload jats-YYYY-MM-DD.dump.age to a private location you control
rm jats.dump
```

- Encrypt before it leaves the job. Keep the private key somewhere other than the repo and other than the backup location.
- Keep at least the last 8 weekly backups and one monthly.
- Fail the job loudly (and notify the owner) if the dump is empty or smaller than the previous one by a large margin.
- The same job must never upload unencrypted dumps or write them to public artifacts.

## Restore procedure

1. Create a **scratch** Supabase project. Never restore directly over production first.
2. Decrypt: `age -d -i <private-key-file> jats-YYYY-MM-DD.dump.age > jats.dump`.
3. Restore: `pg_restore --no-owner --dbname "$SCRATCH_DATABASE_URL" jats.dump` (add `--clean --if-exists` only on a database you are happy to overwrite).
4. Compare row counts for `punches`, `profiles`, `branches`; spot-check a payroll summary for a known period against the live system.
5. If production must be replaced, schedule it, tell the Admins, apply the same restore to the production project, run the smoke test from `docs/runbooks/deploy.md`.
6. Record what was restored, from which backup, and the data gap, in `docs/runbooks/incidents/`.

## Restore drill

Do a full test restore **before the pilot** and then **every quarter**. A backup that has never been restored is not a backup. Put the date and result in the CHANGELOG.
