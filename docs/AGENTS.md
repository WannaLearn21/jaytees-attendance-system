# AGENTS.md — Standing Instructions for AI Coding Agents
**Project: Jaytees Attendance & Time-Tracking System (JATS v1.1)**

## Operating Principles
- **Role Assignment**: Before writing any code, declare which Agent Role from `docs/development.md` you are operating under.
- **Scope Discipline**: Touch ONLY the folders specified in your active task card.
- **Never Trust the Client**: 
  - Time must come from the server (`NOW()`).
  - GPS distance must be computed server-side from stored branch latitude/longitude.
  - Mode C Time Out permissions must be checked against `profiles.allow_offsite_timeout`.
- **Append-Only Ledger**: Never delete or silently update a punch. Use corrections and log changes to `audit_log`.
- **Accessibility & Senior Staff UI**:
  - Minimum tap target: 56px (`min-h-[56px]`).
  - Minimum font size for body: 18px (`text-lg`).
  - High contrast action buttons with single clear intent.
- **Photo Compression**:
  - Live camera stream only.
  - WebP/JPEG format ~35–40 KB at ~480px.
  - Burn-in watermark via HTML Canvas before upload.
- **Zero Cost Rule ($0/mo)**: Never add paid dependencies, third-party APIs with monthly subscription fees, or cloud resources outside Supabase/Vercel free tiers.
- **Documentation**: Record every completed task card in `docs/CHANGELOG.md`.
