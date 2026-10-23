# JATS Agent Development Plan
**Jaytees Attendance & Time-Tracking System (JATS v1.1)**
*A comprehensive guide for building with AI coding agents based on PRD v1.1.*

---

## 1. How This Plan Works

You stay the product owner and reviewer. Coding agents (Claude Code, Antigravity, or similar) build in small slices called **task cards**: one goal, the folders it may touch, and acceptance checks that can actually be run.

- **One task card per agent session**, one git branch per card, one pull request per branch. You review and merge.
- **Agents work against a dev Supabase project** and never see production keys.
- **You personally review anything touching database migrations, row-level security (RLS) policies, and the punch validation function.** That is where fraud and data leaks would happen.
- **Every card ends with passing tests** and a one-line entry in `docs/CHANGELOG.md`.
- **Effort**: roughly 36 focused working days to a feature-complete MVP, then a 2-week pilot. Part-time, expect about double the calendar time.

---

## 2. Agent Roster

| Agent | Owns | Produces |
| :--- | :--- | :--- |
| **Architect** | `docs/`, `AGENTS.md` | Architecture notes, decision records, task cards. Writes no app code. |
| **Database & Security** | `supabase/migrations`, SQL tests | Tables, RLS policies, the punch function, seed data. |
| **Auth & Accounts** | `src/app/(auth)`, account admin | Login, role routing, employee create/edit. |
| **Punch Flow** | `src/app/(employee)`, punch UI | Senior-friendly punch screen, camera, GPS, photo compression, PWA setup. |
| **Admin Dashboard** | `src/app/(admin)` | Live attendance, staff, shifts, branch settings, corrections. |
| **Reports & Jobs** | `src/lib/attendance`, scheduled jobs | Late/undertime/hours engine, payroll export, 60-day photo purge. |
| **QA** | `tests/`, `e2e/` | Playwright flows, geofence edge cases, accessibility checks. Reviews other agents' PRs; writes no feature code. |

*You can run these as one agent wearing different hats. The key discipline is that each task card names exactly one role and one set of folders.*

---

## 3. Standing Instructions (Put in `AGENTS.md` / `CLAUDE.md`)

- **Tech Stack**: Next.js App Router + TypeScript (strict) + Tailwind CSS; Supabase Postgres, Auth, and Storage; Vercel deploys.
- **Zero Client Trust**: Never trust the client for time or location. `punched_at` is set by the server. The distance to the branch is recomputed server-side (Haversine) from submitted coordinates and the branch row. The Mode C Time-Out rule is strictly enforced server-side using `allow_offsite_timeout`.
- **Row-Level Security (RLS)**: Enforced on every table.
  - `USER`: Sees own records only.
  - `ADMIN`: Sees own branch records only.
  - `SYSAD`: Global visibility across all 3 branches.
- **Append-Only Punch Ledger**: Punches are never silently edited. Corrections create new records accompanied by an entry in `audit_log`.
- **Employee UI & Accessibility Standards**:
  - Tap targets minimum `56px` (touch targets up to `68px` for primary actions).
  - Body text at least `18px`.
  - High contrast on primary actions with one primary action per screen.
  - Plain-language error messages (e.g., *"You are too far from the store. Move closer and try again."*).
- **Selfie Photo Standards**:
  - Live front-camera only (`getUserMedia`, no file uploads or gallery selection).
  - Compressed WebP/JPEG format (~35–40 KB at ~480px width).
  - Burned-in canvas watermark (Employee name, branch, PST timestamp, GPS coordinates).
  - Private storage bucket with short-lived signed URLs.
  - Path convention: `branch_id/yyyy-mm/employee_id/punch_id.webp`.
- **$0 Free-Tier Budget**: Do not add paid services, commercial APIs, or paid-tier libraries without explicit owner approval.
- **Hygiene & Quality**: Small PRs, automated tests with each change, and a one-line justification for every new dependency.

---

## 4. Phased Build Plan

### Phase 0: Foundations (~3 days)
- `0.1` Scaffold the repo: Next.js App Router, Tailwind CSS, ESLint, Vitest, Playwright.
- `0.2` Create dev Supabase project, set up Supabase CLI and environment variables (`.env.local`).
- `0.3` Configure Vercel preview deploys and GitHub Actions CI on every PR.
- `0.4` Architect agent writes `docs/AGENTS.md` and foundational architecture notes.
- *Done when*: Preview URL loads over HTTPS and CI is green.

### Phase 1: Data Model & Security (~5 days)
**Target Schema**:
- `branches`: `id`, `name`, `branch_code`, `lat`, `lng`, `radius_m`, `ssid`
- `profiles`: `id`, `employee_code`, `full_name`, `role` (`sysad`, `admin`, `user`), `branch_id`, `allow_offsite_timeout`, `default_shift_id`, `is_active`
- `shift_templates`: `id`, `branch_id`, `name`, `start_time`, `end_time`, `grace_minutes`, `crosses_midnight`
- `punches` *(append-only)*: `id`, `profile_id`, `branch_id`, `shift_template_id`, `type` (`in`, `out`), `punched_at`, `lat`, `lng`, `accuracy_m`, `distance_m`, `inside_geofence`, `selfie_path`, `note`
- `attendance_days` *(view/materialized)*: First-in, last-out, `late_min`, `undertime_min`, `worked_minutes`, status flags.
- `audit_log`: Actor, target entity, old/new payload, timestamp, justification.

**Task Cards**:
- `1.1` Database migrations for core schema tables.
- `1.2` RLS policies with tests: User cannot read others' punches; Branch Admin cannot read other branches.
- `1.3` The Punch Function (`rpc_record_punch`):
  - Time In strictly inside geofence radius.
  - Time Out inside radius, or outside if `allow_offsite_timeout = true` (Mode C).
  - Reject GPS accuracy > 50m (configurable).
  - Prevent double Time In without Time Out.
  - Return clean error codes and senior-friendly error text.
- `1.4` Seed dataset: 3 branches, 10 sample employees, 3 shifts per branch.
- *Done when*: SQL tests cover every role and all Mode C branches.

### Phase 2: Auth & Accounts (~4 days)
- `2.1` Login flow + role-based routing (`SYSAD` / `ADMIN` $\rightarrow$ Dashboard, `USER` $\rightarrow$ Punch Screen).
- `2.2` Admin creates employee accounts for their branch; SysAd manages all branches.
- `2.3` Numeric PIN login support (mapping employee code + PIN to Supabase Auth).
- `2.4` Long-lived sessions for installed mobile PWA kiosks.
- *Done when*: Each role automatically routes to the right screen with E2E access guards.

### Phase 3: Employee Punch Flow (~8 days — *Critical Risk Phase*)
- `3.1` Punch screen: greeting, active shift, clock, geofence radius indicator, live camera view, large touch action.
- `3.2` GPS high-accuracy capture with *"Checking location..."* state and fallback instructions.
- `3.3` Front-camera capture, client-side WebP compression (~35 KB), burned-in watermark overlay.
- `3.4` Secure submission: upload photo to private bucket, invoke RPC, display success feedback.
- `3.5` Mode C Off-Site Time Out interface: displays distance outside store, optional errand note.
- `3.6` PWA manifest, service worker for app shell caching, install prompt.
- `3.7` Employee self-attendance history view.
- *Done when*: Tested and verified on 3 real mobile devices (including budget Android) with senior employee usability sign-off.

### Phase 4: Time Engine & Payroll Calculations (~4 days)
- *Store UTC, compute in Asia/Manila (PST)*:
  - **Late Minutes**: Elapsed minutes after shift start + grace threshold.
  - **Undertime Minutes**: Shift end minus Time Out (non-negative).
  - **Worked Hours**: Time Out minus Time In minus mandatory unpaid meal break.
  - **Edge Cases**: Overnight shifts crossing 00:00; missing Time Out flagged incomplete (no silent closing).
- *Done when*: 25+ unit tests pass covering edge cases, grace boundaries, and overnight shifts.

### Phase 5: Admin & SysAd Dashboards (~8 days)
- `5.1` Live branch attendance feed, selfie lightbox with short-lived signed URLs, summary counters.
- `5.2` Employee roster management with Mode C toggle (`allow_offsite_timeout`).
- `5.3` Shift template management and grace window adjustment.
- `5.4` SysAd controls: Geofence radius slider (50m–300m), GPS coordinates calibration, multi-branch selector.
- `5.5` Attendance corrections: Admin punch adjustments with required audit reason logged to `audit_log`.
- *Done when*: Branch separation is strictly verified in UI and backend API.

### Phase 6: Payroll Export & Housekeeping (~4 days)
- `6.1` Bi-monthly Payroll Export: CSV and Excel formats with stable `employee_code`, days present, net payable hours, late/undertime deductions.
- `6.2` 60-Day Photo Purge: Automated Edge Function / pg_cron job to delete expired punch selfies while preserving punch log rows.
- `6.3` Storage usage meter + manual purge button on SysAd dashboard.
- `6.4` Weekly database backup workflow.
- *Done when*: Generated payroll CSV matches hand-calculated figures.

### Phase 7: Pilot & Rollout (~2 weeks elapsed)
- `7.1` Pilot at one branch (Main Store, ~10 staff) run in parallel with paper cards.
- `7.2` Calibrate GPS accuracy and geofence radius based on real-world store drift.
- `7.3` Usability review with senior staff; adjust button tap targets and font sizes.
- `7.4` Full cutover across all 3 branches; decommission paper time cards.
- *Done when*: Pilot punches match paper cards within established tolerance threshold.

---

## 5. Task Card Template & Sample

### Standard Task Card Format:
```markdown
### Task Card [ID]: [Title]
- **Agent Role**: [Architect | Database & Security | Auth & Accounts | Punch Flow | Admin Dashboard | Reports & Jobs | QA]
- **Goal**: [One clear, actionable sentence]
- **Read First**: [PRD sections, docs/architecture.md, docs/AGENTS.md]
- **May Touch**: [Allowed directories/files]
- **Must Not Touch**: [Forbidden files/directories]
- **Acceptance Criteria**: [Exact terminal commands, SQL checks, and UI behaviors]
- **Report Back**: [Summary of changes, assumptions made, or open questions]
```

### Sample Task Card (Card 1.3):
```markdown
### Task Card 1.3: Implement Server-Side Punch Function
- **Agent Role**: Database & Security
- **Goal**: Write and test the `rpc_record_punch` PostgreSQL function in `supabase/migrations/`.
- **Read First**: PRD v1.1 §1.2 (Mode C Rules), docs/architecture.md
- **May Touch**: `supabase/migrations/`, `supabase/tests/`
- **Must Not Touch**: `src/`, `docs/`, `public/`
- **Acceptance Criteria**:
  1. Time In permitted ONLY when distance <= branch.radius_m.
  2. Time Out permitted inside radius, OR outside if profile.allow_offsite_timeout = true.
  3. Rejects GPS accuracy > 50m with error code `GPS_ACCURACY_POOR`.
  4. Rejects consecutive Time In without preceding Time Out (`ERR_ALREADY_TIMED_IN`).
  5. Sets `punched_at = NOW()` on the database server.
  6. SQL test suite passes: `supabase test db`.
- **Report Back**: Migration file name, test results, any proposed adjustments to RLS policies.
```

---

## 6. Risks & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Buddy Punching / Photo of Photo** | Medium | Server timestamps, live camera only (`getUserMedia`), burned-in watermark, admin review in live selfie feed. *(Full biometric AI liveness deferred post-MVP)*. |
| **GPS Spoofing Tools** | Medium | Server calculates distance using stored branch coordinates; check device `is_mock` flag where exposed; flag accuracy jumps > 50m. |
| **Indoor GPS Signal Drift** | High | Calibrate per-branch radius (100m–150m); log Wi-Fi SSID anchor; provide administrative punch correction flow. |
| **Free-Tier Limits ($0/mo)** | High | Supabase 500MB DB / 1GB Storage managed via automatic 60-day selfie file purge; compress images to WebP (~35KB). |
| **Data Privacy (RA 10173)** | High | Collect GPS & photo only at punch time; retain photos for only 60 days; enforce strict role-based RLS. |
| **Browser Compatibility** | Medium | Enforce HTTPS for WebRTC/Geolocation; test on Safari iOS and Chrome Android as an installed PWA. |

---

## 7. Key Decisions Log (Owner Alignments)

1. **Login Method**: Employee Code + 4-digit PIN (avoids email requirement for senior non-desk employees).
2. **Shift Assignment**: Assigned default shift template per employee, with auto-detection based on punch window.
3. **Grace Period**: Punches within 10–15 min grace window count as on-time. Once breached, tardiness counts from nominal shift start.
4. **Early Arrivals**: Punches before shift start register actual punch time, but payable regular hours accumulate from nominal shift start unless OT authorized.
5. **Meal Deductions**: 60-minute unpaid lunch automatically deducted on completed shifts (no break punches needed).
6. **Network Drops**: Real-time server validation is mandatory for Beta; offline queueing deferred to v1.2 to prevent location spoofing.
7. **Incomplete Punches**: Missing Time Out flagged as *"Incomplete"* for Branch Admin resolution.

---

## 8. MVP Definition of Done

- [ ] All 3 RBAC roles (`SYSAD`, `ADMIN`, `USER`) function end-to-end with verified RLS isolation.
- [ ] Time In and Time Out enforce geofence, live selfie, and Mode C rules strictly on the server.
- [ ] Tardy, undertime, and net payable hours calculate accurately across morning, mid, and closing shifts.
- [ ] Payroll CSV export matches manual bi-monthly computation.
- [ ] Automated 60-day selfie storage purge maintains $0/month free-tier budget ceiling.
- [ ] Successful 2-week pilot completed at one branch with zero paper timecard dependencies.
