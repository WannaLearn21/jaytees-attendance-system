# Glossary

Words used in the PRD, docs and code. Use these exact terms in code, UI copy and PR descriptions.

| Term | Meaning |
| :--- | :--- |
| **JATS** | Jaytees Attendance & Time-Tracking System, this product |
| **Branch** | One of the 3 store locations; has GPS coordinates, a radius and a timezone |
| **Geofence** | The circle around a branch (center + `radius_m`) inside which a punch counts as "at the store". Inside means `distance_m <= radius_m` |
| **Time In / Time Out** | The only two punches. No break punches in MVP |
| **Punch** | One Time In or Time Out record in `punches`: server time, location, distance, selfie, flags |
| **Selfie** | The live photo taken at the moment of a punch; watermarked, about 35-40 KB, kept 60 days |
| **Watermark** | Name, branch, time and coordinates burned into the selfie before upload |
| **Mode C** | The PRD's role-based Time Out policy: Time In always inside the geofence; Time Out inside the geofence unless the employee has `allow_offsite_timeout` |
| **Off-site Time Out** | A Time Out made outside the geofence by an employee with `allow_offsite_timeout = true`; stores distance and an optional errand note |
| **`allow_offsite_timeout`** | Per-employee permission toggled by Admin (own branch) or SysAd |
| **SysAd** | System Admin (level 1): all branches, sets geofences, manages photo storage |
| **Admin** | Branch Admin (level 2): own branch only; manages `user` accounts, shifts, corrections, exports |
| **User** | Employee (level 3): punches and sees own hours |
| **Employee code** | The employee's login id (for example `JT-0042`) |
| **One-time PIN** | Random PIN given when an account is created or reset; must be changed at first sign-in |
| **Shift template** | A named schedule per branch (Opening, Mid, Closing): start, end, grace minutes |
| **Grace period** | Minutes after shift start in which Time In is not counted as late (meaning of exceeding it: open decision D3) |
| **`shift_date`** | The branch-local date a shift belongs to. Assigned at Time In; Time Out inherits it. Pairs punches, selects payroll periods |
| **Crosses midnight** | A shift whose end time is on the next calendar day (for example 20:00 to 04:00) |
| **Late (min)** | Minutes Time In is after the allowed start, per `docs/attendance-rules.md` |
| **Undertime (min)** | Minutes Time Out is before the scheduled end |
| **Worked minutes / hours** | Time between Time In and Time Out, with the rules in the attendance rules doc |
| **Extra (min)** | Informational minutes worked outside the scheduled window; not overtime pay |
| **Incomplete day** | A Time In with no Time Out after the cutoff; flagged, never auto-closed, excluded from hour totals until corrected |
| **Adjustment / correction** | An Admin-entered `add` or `void` with a required reason in `punch_adjustments`. Original punches are never edited |
| **Flag** | A warning on a punch or day for human review (`low_accuracy`, `offsite_out`, `fast_repeat`, `duplicate_photo`, `location_jump`, `shared_device`, `very_late`, `very_early`, `adjusted`). Flags never change pay by themselves |
| **`attendance_days`** | The SQL view that computes each employee's day. The only place hours are calculated |
| **RLS** | Row-level security: database rules deciding which rows each user can read or change |
| **Service role key** | A powerful Supabase key that bypasses RLS. Allowed only in jobs and account-admin routes, never in the browser |
| **Idempotency key (`punch_id`)** | A UUID created on the phone for each punch so a retry never creates a second punch |
| **Signed URL** | A temporary link (about 60 seconds) to view a private selfie |
| **Purge** | The daily job that deletes selfies older than 60 days and clears `selfie_path` |
| **PWA** | Progressive Web App: the website installed to the phone's home screen |
| **Kiosk mode** | A shared in-store tablet used for punching; a possible fallback, not in MVP |
| **Pilot** | Running JATS in one branch alongside paper cards before full rollout |
| **Task card** | A small unit of work for one agent session (`docs/tasks/backlog.md`) |
| **ADR / decision record** | A short note recording why a choice was made (`docs/decisions/`) |
