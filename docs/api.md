# API Contracts

HTTP routes and database calls the app exposes. Everything else (reading tables, admin lists) goes through the Supabase client under RLS; there is no custom REST layer for plain reads in MVP.

Related: `docs/architecture.md` (punch flow, error codes), `docs/security.md`, `docs/database.md`.

Conventions:

- JSON in, JSON out, UTF-8. Timestamps are ISO 8601 UTC strings.
- Every route requires a session cookie unless stated otherwise.
- Success: `{ "ok": true, ... }`. Failure: `{ "ok": false, "code": "<CODE>", "message": "<plain language>" }`.
- Never return stack traces, SQL errors or other users' data.
- State-changing routes check the `Origin` header and validate the body with zod; unknown fields are rejected.

---

## 1. Error codes and HTTP status

| Code | HTTP | Source |
| :--- | :--- | :--- |
| `VALIDATION_FAILED` | 400 | Route (body did not match schema) |
| `NOT_AUTHENTICATED` | 401 | Route / `punch()` |
| `ACCOUNT_INACTIVE` | 403 | `punch()` |
| `FORBIDDEN` | 403 | Route (role not allowed) |
| `ALREADY_TIMED_IN` | 409 | `punch()` |
| `NO_OPEN_SHIFT` | 409 | `punch()` |
| `OUTSIDE_GEOFENCE` | 422 | `punch()` |
| `GPS_TOO_INACCURATE` | 422 | `punch()` |
| `SELFIE_MISSING` | 422 | `punch()` |
| `NO_SHIFT_ASSIGNED` | 422 | `punch()` |
| `RATE_LIMITED` | 429 | Route / `punch()` |
| `INTERNAL` | 500 | Route (generic; details only in server logs) |

`VALIDATION_FAILED`, `FORBIDDEN` and `INTERNAL` are route-level; the rest come from `punch()` and match `docs/architecture.md`. Adding a code needs owner approval and an update to both docs and `lib/errors.ts`.

---

## 2. `POST /api/punch`

Role: any signed-in active profile (acts only on itself).

Before calling, the browser uploads the selfie to `selfies/{branch_id}/{yyyy-mm}/{profile_id}/{punch_id}.jpg`.

Request:

```json
{
  "punch_id": "uuid-v4 generated on the phone",
  "type": "in",
  "lat": 14.0000,
  "lng": 120.0000,
  "accuracy_m": 12.5,
  "selfie_path": "branchId/2026-10/profileId/punchId.jpg",
  "note": "optional, max 200 chars (off-site errand text)",
  "device_id": "random id kept on the phone"
}
```

Rules: `type` is `in` or `out`; `lat` -90..90; `lng` -180..180; `accuracy_m` > 0; `note` plain text only. The request has **no time field**. The server hashes `device_id` before storing it as `device_hash`.

Success `200`:

```json
{
  "ok": true,
  "punch": {
    "id": "uuid",
    "type": "in",
    "punched_at": "2026-10-22T22:56:04Z",
    "shift_date": "2026-10-23",
    "distance_m": 24,
    "inside_geofence": true,
    "flags": []
  }
}
```

Failure: see error codes. Retrying with the same `punch_id` after a success returns the same success body (idempotent).

Flow and validation order: `docs/architecture.md` section 4.

---

## 3. `GET /api/selfie/{punch_id}`

Role: `admin` (own branch) or `sysad`. Returns a short-lived signed URL; the photo itself is never public.

Success `200`: `{ "ok": true, "url": "https://...", "expires_in": 60 }`.

Failure: `403 FORBIDDEN` if the punch is not visible to the caller under RLS, `404` if the photo was purged (`selfie_path` is null). The URL is created with the **caller's own session** and storage policies, not the service role.

---

## 4. `GET /api/export/payroll`

Role: `admin` (own branch only) or `sysad`.

Query: `branch_id` (uuid; Admin's value must be their branch), `from` and `to` (dates, by `shift_date`), `format` (`csv` or `xlsx`), optional `detail` (`summary` default, or `daily`).

Summary columns, in order: `employee_code`, `full_name`, `branch`, `period_start`, `period_end`, `days_present`, `total_hours`, `late_min`, `undertime_min`, `incomplete_days`. Definitions: `docs/attendance-rules.md` section 6. The `daily` detail adds one row per employee per `shift_date` with time in, time out, late, undertime, worked minutes and flags. XLSX has sheets `Summary` and `Daily`.

Safety: write text as string cells. In CSV, prefix any cell that starts with `=`, `+`, `-` or `@` with `'` so spreadsheet apps do not run it as a formula. Audit-log every export (who, branch, period, format).

Errors: `400 VALIDATION_FAILED` (bad dates, `from` after `to`, range over 366 days), `403 FORBIDDEN`.

---

## 5. Account administration (service role behind a role check)

Used by the Staff screens. Each route first confirms the caller is an active `admin` (may act only on `user` accounts in their own branch) or `sysad` (anyone), then uses the Supabase admin API. All actions are audit-logged.

### `POST /api/admin/accounts`

```json
{
  "employee_code": "JT-0042",
  "full_name": "string",
  "role": "user",
  "branch_id": "uuid",
  "default_shift_id": "uuid or null"
}
```

For an Admin caller, `role` is forced to `user` and `branch_id` to their own branch; any other value is rejected. Creates the auth identity (internal email-style login), the `profiles` row, and a random one-time PIN. Response: `{ "ok": true, "profile_id": "uuid", "one_time_pin": "123456" }`. The PIN is returned **once**, never stored in plain text, never logged. First login must force a PIN change (store `must_change_pin` in the auth user's `app_metadata`).

### `POST /api/admin/accounts/{id}/reset-pin`

New one-time PIN, same handling. Response as above.

### `POST /api/admin/accounts/{id}/deactivate` and `/reactivate`

Sets `profiles.is_active`. On deactivate, also block sign-in at the auth layer (as far as I know the Supabase admin API supports banning a user via `ban_duration`; verify in the current SDK). Because `punch()` and the RLS helper functions check `is_active`, a stale session cannot punch or read data either way.

Errors: `403 FORBIDDEN` when an Admin targets another branch or a non-`user` account; `409` when `employee_code` already exists.

---

## 6. `POST /api/jobs/purge`

Not for people. Called by the scheduler.

Auth: header `Authorization: Bearer <CRON_SECRET>`. Anything else returns `401`. Optional query `dry_run=1` lists what would be deleted without deleting.

Behavior: for punches older than 60 days with a non-null `selfie_path`, delete the storage object, then set `selfie_path` to null. Idempotent and safe to re-run.

Success: `{ "ok": true, "scanned": 0, "deleted": 0, "nulled": 0, "errors": 0 }` (counts only; no file names). Writes one `audit_log` row per run. Details: `docs/runbooks/photo-purge.md`.

---

## 7. Database calls (called from the app, enforced by RLS)

| Call | Used by | Notes |
| :--- | :--- | :--- |
| `rpc('punch', {...})` | `/api/punch` only | `SECURITY DEFINER`; the only way to create a punch |
| `from('attendance_days').select(...)` | My hours, Live attendance, payroll preview | View with `security_invoker = true` |
| `from('punches').select(...)` | History detail, selfie lookups | Read only |
| `from('shift_templates')` insert/update | Shifts screen | Admin (own branch), SysAd |
| `from('profiles')` update (`allow_offsite_timeout`, `default_shift_id`, name) | Staff screen | Audit-logged via trigger or function |
| `from('branches')` update | Branch settings | SysAd only |
| `from('punch_adjustments')` insert | Correction dialog | Reason required; Admin own branch, SysAd |
| `from('consents')` insert | First-login consent | Own row |

Never expose these as unauthenticated endpoints. Never pass a role, branch or profile id from the client as a trusted value.
