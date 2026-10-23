# JATS v1.1 Engineering Changelog

All notable changes and task card completions are documented here.

---

### [Unreleased]
- **Card 0.1**: Frontend UI extraction from Stitch ("Imperial Precision" Theme).
- **Card 0.2**: Next.js App Router scaffold with 5 interactive screens (Dashboard, Geofences & Mode C, Shift Scheduling, Payroll Center, Senior Punch Station).
- **Card 0.3**: Local dev server Windows casing fix script (`scripts/start-dev.js`).
- **Card 0.4**: Creation of `docs/development.md` and `docs/AGENTS.md`.
- **Phase 1 (Database & Security)**: Authored core PostgreSQL schema, RLS policies for 3-tier RBAC isolation, `rpc_record_punch` server-side Haversine geofence & Mode C engine, and 3-branch seed data.
- **Phase 2 (Auth & Accounts)**: Implemented 4-digit numeric PIN authentication with internal email mapping, session persistence, role routing guards, and Admin employee creation modal.
- **Phase 3 (Employee Punch Flow & PWA)**: Deployed senior-friendly punch UI with 56px+ tap targets, WebP photo compression with burned-in watermarks, Mode C off-site time out, PWA manifest, service worker caching, and My Attendance History modal.
- **Phase 4 (Attendance & Time Engine)**: Built core time engine with 25 table-driven unit tests verifying tardiness, undertime, overnight shifts, and meal deduction rules.
- **Phase 5 (Admin & SysAd Dashboards)**: Implemented wireframe-aligned Live Attendance dashboard with 4-card metric strip (`Clocked in`, `Not yet in`, `Late today`, `Off-site Time Out`), selfie signed-URL lightbox, Staff & Shifts 2-column manager (`Shift templates` and `Staff` with interactive Mode C toggle), punch attendance corrections with mandatory audit logging (Card 5.5), and SysAd Photo Storage manager with 60-day auto-purge policy.
- **Phase 6 (Payroll Export & Housekeeping)**: Implemented wireframe-matching Payroll Export center with branch/period filter, ledger preview table (`Code`, `Employee`, `Days present`, `Total hours`, `Late (min)`, `Undertime (min)`, `Incomplete days`), UTF-8 BOM CSV export, Excel SpreadsheetML export, 60-day auto-purge verification, and verified payroll calculation against hand-calculated totals.


