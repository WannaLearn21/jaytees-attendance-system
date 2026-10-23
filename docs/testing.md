# Testing

What "tested" means for JATS. Most of the risk is in **who can see what**, **whether a punch is valid**, and **whether the hours are right**, so those get the strongest tests. Pixel-perfect UI tests come last.

Related: `docs/security.md`, `docs/attendance-rules.md`, `docs/api.md`.

---

## 1. Test layers

| Layer | Tool | Covers | Runs |
| :--- | :--- | :--- | :--- |
| SQL tests | pgTAP (`supabase test db`) | RLS, `punch()`, `attendance_days`, append-only triggers, storage policies | Every PR |
| Unit tests | Vitest | Validation schemas, geo helpers, image compress/watermark, error mapping, export formatting | Every PR |
| End-to-end | Playwright | Real user flows in a browser with fake GPS and camera | Every PR (core flows), nightly (full) |
| Accessibility | `@axe-core/playwright` | Automated checks on every screen | Every PR |
| Manual device tests | Real phones | Camera, GPS, PWA install, sunlight, old devices | Before pilot and after big UI changes |

Rules: a bug fix starts with a failing test. A PR that changes RLS, `punch()` or the attendance math without tests is not mergeable.

---

## 2. Test data

- Seed only **fake** data (`supabase/seed.sql`): 3 branches with distinct coordinates, about 10 fake employees (`TEST-0001`...), 3 shift templates per branch, one Admin per branch, one SysAd.
- Never use real names, real selfies or real coordinates of employees. Generate a plain placeholder JPEG for photo tests.
- Each test creates what it needs and cleans up, or runs in a transaction that rolls back (pgTAP default).

---

## 3. SQL test matrix: access control

Personas: **anon** (signed out), **user A** and **user B** (same branch 1), **user C** (branch 2), **admin 1**, **admin 2**, **sysad**.

Every cell marked "must fail" is a test.

| Check | Expected |
| :--- | :--- |
| anon reads any table | Fails / empty on all |
| user A reads user B's punches | Empty |
| user A reads user C's profile | Empty |
| user A updates own `role`, `branch_id` or `allow_offsite_timeout` | Fails |
| user A inserts, updates or deletes a row in `punches` directly | Fails |
| admin 1 reads branch 2 punches, profiles, shifts | Empty |
| admin 1 creates an `admin` or `sysad` profile | Fails |
| admin 1 edits branch 1 `user` and toggles off-site Time Out | Succeeds, audit row written |
| admin 1 edits a branch's coordinates or radius | Fails (SysAd only) |
| admin 1 deletes or edits a punch | Fails |
| `attendance_days` queried as admin 1 | Branch 1 rows only (view uses `security_invoker`) |
| `attendance_days` queried as user A | Own rows only |
| Any role updates or deletes `audit_log` | Fails |
| Update on `punches` changing anything except `selfie_path` to null | Fails (guard trigger) |
| Storage: user A reads any `selfies` object | Fails |
| Storage: user A uploads to another user's path | Fails |
| Storage: admin 1 reads a branch 2 selfie | Fails |
| Signed-in user calls `punch()` for another profile id | Not possible: function uses `auth.uid()`, no profile parameter |

---

## 4. SQL test matrix: `punch()`

Branch 1 radius 100 m. "Inside" = `distance_m <= radius_m` (boundary is inside).

| # | Scenario | Expected |
| :--- | :--- | :--- |
| 1 | Time In inside radius, good accuracy, photo exists | OK; row created with server `punched_at` |
| 2 | Time In outside radius | `OUTSIDE_GEOFENCE`; no row |
| 3 | Time In at exactly `radius_m` | OK |
| 4 | Time In near **branch 2** while assigned to branch 1 | `OUTSIDE_GEOFENCE` |
| 5 | Accuracy worse than the gate | `GPS_TOO_INACCURATE` |
| 6 | Second Time In while open | `ALREADY_TIMED_IN` |
| 7 | Time Out with no open shift | `NO_OPEN_SHIFT` |
| 8 | Time Out inside radius | OK |
| 9 | Time Out outside, `allow_offsite_timeout = false` | `OUTSIDE_GEOFENCE` |
| 10 | Time Out outside, `allow_offsite_timeout = true` | OK; `offsite_out` flag; note and distance stored |
| 11 | Inactive profile | `ACCOUNT_INACTIVE` |
| 12 | No default shift assigned | `NO_SHIFT_ASSIGNED` |
| 13 | `selfie_path` missing, malformed, other user's folder, or object absent | `SELFIE_MISSING` |
| 14 | Object is not a JPEG or exceeds the size cap | `SELFIE_MISSING` |
| 15 | Same `punch_id` sent twice | One row; second call returns the stored result |
| 16 | Two parallel requests for Time In | Exactly one row |
| 17 | Request tries to supply a time | Not accepted; server time used |
| 18 | Two punches within a few seconds | `RATE_LIMITED` or `fast_repeat` flag (per final design) |
| 19 | Overnight template, Time In after midnight in the tail | `shift_date` is the previous date |
| 20 | Same photo object reused for a second punch | `duplicate_photo` flag |

---

## 5. `attendance_days` tests

Table-driven: every row in `docs/attendance-rules.md` section 5 becomes a test case. Run each case under both values of `LATE_COUNTS_FROM` and `HOURS_COUNT_FROM` until the owner decides. Also test:

- Seconds truncation, and the grace boundary (inclusive).
- Incomplete day before and after the cutoff.
- An adjustment `add` and an adjustment `void`.
- A period query that spans a month end, and one that includes an overnight shift on the last day.
- Payroll totals equal the sum of day rows (compare against hand-calculated values).

---

## 6. End-to-end flows (Playwright)

Chromium config for fake devices:

```ts
use: {
  permissions: ['geolocation', 'camera'],
  geolocation: { latitude: BRANCH1_LAT, longitude: BRANCH1_LNG, accuracy: 10 },
  launchOptions: {
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  },
}
```

Use `context.setGeolocation(...)` to move the "phone" mid-test, `context.setOffline(true)` for no signal, and project settings with a phone viewport (390 x 844).

| # | Flow | Checks |
| :--- | :--- | :--- |
| E1 | Employee signs in, lands on Punch | Role routing; no admin links |
| E2 | Time In inside branch | Success screen with time; row visible in My hours |
| E3 | Time In outside branch | Plain-language error; button usable for retry; no row |
| E4 | Location permission denied | Help message shown; button explains why it is disabled |
| E5 | Off-site Time Out (permission on) | Distance and note shown; saved with flag |
| E6 | Off-site Time Out (permission off) | Blocked with message |
| E7 | Offline punch | "Not saved" message; nothing queued |
| E8 | Double-tap the button | One punch only |
| E9 | Admin sees the employee's punch and selfie | Live table updates within the polling interval |
| E10 | Admin of branch 1 opens a branch 2 URL | No data; redirected or empty |
| E11 | Admin toggles off-site Time Out | Reflected for that employee; audit entry exists |
| E12 | Admin creates an employee | One-time PIN shown once; first login forces PIN change |
| E13 | Payroll export | File downloads; totals match the preview; formula-injection cells are escaped |
| E14 | Deactivated employee | Cannot sign in; stale session cannot punch |
| E15 | Role redirects | Each role cannot open the other roles' pages |

---

## 7. Accessibility and UI checks

- Run axe on every screen at phone and desktop sizes; zero serious or critical violations.
- Assert tap-target size on the Punch screen (buttons at least 56 px).
- Assert text scales at 200% without horizontal scroll.
- Colors come from tokens only; add a lint or test that rejects raw hex values in components (see `docs/ui.md`).
- Walk through `docs/ui.md` section 8 for every UI PR.

---

## 8. Performance checks

- Punch round trip under 5 s with Chromium's "Fast 4G" throttling.
- `/punch` initial JavaScript under 150 KB gzipped (fail CI when exceeded).
- Compressed selfie at or under about 40 KB.

---

## 9. Manual device matrix (before pilot)

| Device | Browser | Mode |
| :--- | :--- | :--- |
| Low-end Android (2-3 years old) | Chrome | Browser and installed PWA |
| Mid-range Android | Chrome, Samsung Internet if common | Installed PWA |
| iPhone (recent) | Safari | Browser and Home Screen app |
| Older iPhone (oldest iOS you will support) | Safari | Home Screen app |

Conditions to try on at least two devices: bright sun, dim room, indoors with weak GPS, airplane mode, location off, camera denied, low battery mode, large system font size.

Pass criteria: an older employee completes Time In and Time Out with no coaching.

---

## 10. CI

Order: lint, typecheck, unit tests, `supabase db reset` + `supabase test db`, build, Playwright core flows, axe. Any failure blocks merge. Nightly: full Playwright suite and a dependency audit.
