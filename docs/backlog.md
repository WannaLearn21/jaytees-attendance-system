# Backlog

All task cards for the MVP, by phase. This list supersedes the card numbering in the earlier development plan (it adds cards the plan implied). Format and rules: `docs/tasks/README.md`.

Legend: **Review** = human security review required. **Needs** lists earlier cards or open decisions (D-numbers in `docs/decisions/README.md`).

Effort so far: about 36 focused working days to a feature-complete MVP, then a 2-week pilot.

---

## Phase 0: Foundations

| ID | Agent | Goal | May touch | Acceptance | Review |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 0.1 | Architect | Scaffold Next.js (App Router, TS strict), Tailwind, ESLint, Vitest, Playwright; put `AGENTS.md`, `docs/`, `PRD.md` in the repo | repo root, `docs/` | `npm run lint`, `typecheck`, `test` pass on an empty app | No |
| 0.2 | Database | Create dev Supabase project, init Supabase CLI, `.env.example`, local `supabase start` working | `supabase/`, `.env.example` | `supabase db reset` runs; no secrets committed | No |
| 0.3 | Architect | CI on every PR (lint, typecheck, unit, SQL, build) and Vercel preview deploys | `.github/`, config | Green CI; preview URL loads over HTTPS | No |
| 0.4 | Punch | Tailwind tokens from `docs/ui.md` and shared primitives: `PunchButton`, `StatusBanner`, `StatTile`, `Badge`, `Field`, `ConfirmDialog` | `components/ui/`, `tailwind.config.ts` | Components render with tokens only; axe clean; sizes meet `docs/ui.md` | No |

## Phase 1: Data model and security

| ID | Agent | Goal | Needs | Acceptance | Review |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1.1 | Database | Migrations for `branches`, `profiles`, `shift_templates`, `punches`, enums, constraints, indexes | 0.2 | `db reset` passes; types generated | Yes |
| 1.2 | Database | `app_role()`, `app_branch_id()` and RLS policies per the table in `docs/security.md` section 3 | 1.1 | RLS matrix in `docs/testing.md` section 3 passes | Yes |
| 1.3 | Database | Append-only guard on `punches`, `audit_log` table, privilege revokes | 1.1 | Direct insert/update/delete fails for all app roles; purge-style `selfie_path` null update works | Yes |
| 1.4 | Database | `punch()` function | 1.1-1.3, D8, D11 | All rows of the `punch()` matrix pass | Yes |
| 1.5 | Database | `punch_adjustments` and `consents` tables with RLS | 1.2 | Admin adds adjustment only with a reason and only in own branch | Yes |
| 1.6 | Database | Storage bucket `selfies` with policies | 1.2 | Storage rows of the RLS matrix pass | Yes |
| 1.7 | Database | `seed.sql` with 3 branches, ~10 fake employees, templates | 1.1 | `db reset` loads seed; no real data | No |

## Phase 2: Auth and accounts

| ID | Agent | Goal | Needs | Acceptance | Review |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2.1 | Auth | Login (employee code + PIN) and role-based routing | 1.2, D1 | E1 and E15 pass | Yes |
| 2.2 | Auth | `/api/admin/accounts` create, reset PIN, deactivate, reactivate | 2.1 | Admin limited to own-branch `user` accounts; PIN shown once; audit rows written | Yes |
| 2.3 | Auth | Forced PIN change on first login; PIN strength rules | 2.2 | Weak PINs rejected; E12 passes | Yes |
| 2.4 | Auth | Privacy notice and consent screen; record `consents` | 1.5, notice text approved | Cannot reach Punch before accepting current version | No |
| 2.5 | Auth | Long-lived session for employees, explicit sign out | 2.1 | Installed PWA stays signed in across a shift | No |

## Phase 3: Employee punch flow

| ID | Agent | Goal | Needs | Acceptance | Review |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 3.1 | Punch | Punch screen layout per wireframes 1-2 and `docs/ui.md` | 0.4 | Matches tap-target and contrast rules | No |
| 3.2 | Punch | Geolocation module: high accuracy fix, accuracy reporting, denied-permission help | 3.1 | E4 passes; clear states for finding, ok, weak, denied | No |
| 3.3 | Punch | Camera capture (front, live only), compress to about 35-40 KB JPEG, watermark, EXIF stripped | 3.1 | Unit tests for size and watermark; no gallery input anywhere | No |
| 3.4 | Punch | `/api/punch`, upload-then-submit flow, success and error screens, double-tap protection | 1.4, 3.2, 3.3 | E2, E3, E8 pass | Yes |
| 3.5 | Punch | Off-site Time Out variant (distance, note) | 3.4 | E5 and E6 pass | No |
| 3.6 | Punch | PWA manifest, install prompt, service worker for app shell only | 3.4 | Installable; punches never queued offline (E7) | No |
| 3.7 | Punch | My hours screen per wireframe 3 | 4.1 | Reads `attendance_days`; matches rules doc | No |

## Phase 4: Time engine

| ID | Agent | Goal | Needs | Acceptance | Review |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 4.1 | Reports | `attendance_days` view with named parameters | 1.4, D3, D4, D5 | Every example in `docs/attendance-rules.md` section 5 passes under both option values | Yes |
| 4.2 | Reports | Incomplete days, overnight shifts, adjustments, flags | 4.1, 1.5 | Rows 11-15 and adjustment tests pass | Yes |
| 4.3 | QA | Table-driven test suite and a hand-calculated month fixture | 4.1 | Fixture totals match by hand | No |

## Phase 5: Admin and SysAd dashboards

| ID | Agent | Goal | Needs | Acceptance | Review |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 5.1 | Admin | Live attendance per wireframe 4, 30 s polling, branch switcher for SysAd | 4.1 | E9 passes | No |
| 5.2 | Admin | `/api/selfie/{punch_id}` signed URLs and viewer | 1.6 | URL expires in about 60 s; other branch denied | Yes |
| 5.3 | Admin | Staff list, create, edit, off-site toggle per wireframe 5 | 2.2 | E11, E12 pass | Yes |
| 5.4 | Admin | Shift template create, edit, deactivate | 1.2 | Admin edits own branch only | No |
| 5.5 | Admin | SysAd: branch coordinates and radius with map pin | 1.2 | Only SysAd can save; audit logged | Yes |
| 5.6 | Admin | Attendance corrections dialog (reason required) | 1.5, 4.2, D7 | Original punches untouched; audit row; day shows adjusted | Yes |
| 5.7 | Admin | Read-only audit log view for SysAd (Admin: own branch) | 1.3 | Rows filter by date and actor | No |

## Phase 6: Payroll export and housekeeping

| ID | Agent | Goal | Needs | Acceptance | Review |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 6.1 | Reports | Payroll preview and export (CSV, XLSX, summary and daily) | 4.2 | E13 passes; totals match hand calculation; formula cells escaped | Yes |
| 6.2 | Reports | `/api/jobs/purge` and Photo storage screen (usage, manual purge) | 1.6 | Rejects without secret; dry run works; idempotent | Yes |
| 6.3 | Architect | Weekly encrypted database backup workflow and restore test | 0.3 | Restore into a scratch project succeeds | Yes |
| 6.4 | Architect | Security headers and CSP; Origin checks on mutating routes | 3.4 | Headers verified in deployed preview | Yes |
| 6.5 | QA | Full Playwright suite, axe on all screens, performance budgets in CI | all | E1-E15 pass; budgets enforced | No |

## Phase 7: Pilot and rollout (mostly human)

| ID | Owner | Goal | Acceptance |
| :--- | :--- | :--- | :--- |
| 7.1 | Owner | Real branch coordinates entered by SysAd; real employees created; consent notice finalized | Pilot branch ready |
| 7.2 | Owner | Pilot one branch (about 10 people) for 1-2 pay periods alongside paper cards | Punches match paper within the agreed tolerance |
| 7.3 | Owner + agents | Tune radius, accuracy gate, rate limit from real data; fix usability issues found | Changes recorded as decisions |
| 7.4 | Owner | Watch three older employees punch with no coaching | No help needed |
| 7.5 | Owner | Roll out to the other two branches; retire paper cards | All branches live |
