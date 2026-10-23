# Runbook: Selfie Photo Purge

Selfies are kept for **60 days**, then deleted. Punch records stay; only the photo goes. This keeps storage within the free tier (about 180 MB of new photos a month) and limits how long personal images exist. Route contract: `docs/api.md` section 6.

## What the job does

1. Finds punches older than 60 days where `selfie_path` is not null.
2. Deletes each photo from the `selfies` bucket.
3. Sets `selfie_path` to null on the punch (the only update the append-only guard allows).
4. Writes one `audit_log` row with counts only (scanned, deleted, nulled, errors).

It is safe to run more than once. A photo already gone is skipped and the path is cleared.

## Schedule

Daily, from Vercel Cron calling `POST /api/jobs/purge` with `Authorization: Bearer <CRON_SECRET>` (see `docs/runbooks/deploy.md`). The route also needs the service role key on the server.

## Check it is working

- SysAd opens **Photo storage**: the last run time, counts and current usage are shown.
- Usage should level off around 60 days of photos (about 180 MB at the planned volume), not grow without limit.
- Alert yourself if no run is recorded for 2 days, or if `errors` is above zero twice in a row.

## Manual run

1. From **Photo storage**, choose **Run purge now**. Start with a **dry run** (`?dry_run=1`), which only lists counts.
2. Check the counts look reasonable. A very large number on a first run is expected if photos built up before the job existed.
3. Run it for real.

## Orphaned uploads

A photo can be uploaded and then the punch fails (for example the phone loses signal). Those files have no punch row. The job also removes objects in `selfies` that have no matching punch and are older than 2 days. Log counts only.

## If it fails

| Symptom | Likely cause | Action |
| :--- | :--- | :--- |
| `401` from the route | Wrong or missing `CRON_SECRET` | Fix the environment variable, redeploy |
| Errors deleting files | Storage API error or timeout | Re-run; the job is idempotent |
| Usage near the free limit (1 GB) | Purge not running, or more photos than planned | Run manually, then investigate; consider a smaller image size before changing the retention |
| Photos missing before 60 days | Someone ran a purge with the wrong cutoff | Photos cannot be recovered; fix the cutoff, record the incident |

## Changing retention

Retention (60 days) is stated in the privacy notice. Changing it needs an owner decision, an updated notice (new `notice_version`, employees re-consent), and an updated cutoff in the job.
