# Runbook: Deploy

Humans run production deploys. Agents work only against the `dev` Supabase project.

## Environments

| Env | App | Database | Who |
| :--- | :--- | :--- | :--- |
| Local | `npm run dev` | `supabase start` | Anyone |
| Preview | Vercel preview per PR | `dev` Supabase project | CI / agents |
| Production | Vercel production | `prod` Supabase project | Owner only |

Environment variables are in `docs/architecture.md` section 6. Production values are set in the Vercel dashboard, never in the repo.

## Normal release

1. Confirm the PR is merged to `main` and CI is green (lint, typecheck, unit, SQL tests, e2e core).
2. If the release includes migrations, take a **fresh backup first** (`docs/runbooks/backup-restore.md`).
3. Apply migrations to prod, from your own machine with the prod project linked: `supabase db push`. Read the list it prints before confirming.
4. Let Vercel deploy `main` to production (or promote the verified preview).
5. Smoke test on the production URL with a test account at a test branch:
   - Sign in as Admin; the live screen loads.
   - Sign in as a test employee; Time In inside the test branch geofence succeeds; the Admin sees it with a selfie.
   - Time Out succeeds; My hours shows the day.
   - The cron route returns `401` without the secret.
6. Add a line to `docs/CHANGELOG.md` with date and version.

Do the smoke test with a **test branch** whose coordinates you control, and delete or deactivate test punches afterwards through an adjustment or by marking the test accounts inactive. Do not punch as a real employee.

## Cron

`vercel.json`:

```json
{ "crons": [{ "path": "/api/jobs/purge", "schedule": "0 18 * * *" }] }
```

The schedule is UTC; pick a quiet hour for your branches. Set `CRON_SECRET` in the Vercel environment; as far as I know Vercel sends it as `Authorization: Bearer <CRON_SECRET>`. Check current limits for your plan (Hobby cron frequency is restricted).

## Rollback

- **App:** use Vercel's "promote previous deployment" to roll back instantly.
- **Database:** do not edit applied migrations. Write a new migration that fixes forward. If data is damaged, restore from backup into a scratch project first, compare, then decide.
- **Never** roll back by deleting punches.

## After any incident

Write a short note: what happened, what was affected, what was done, what changes. Store it in `docs/runbooks/incidents/` (create the folder on first use).
