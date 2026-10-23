# AGENTS.md

Instructions for AI coding agents working on **JATS** (Jaytees Attendance & Time-Tracking System): a mobile-first PWA and admin dashboard that replaces paper time cards across 3 branches (~100 employees) using GPS geofence + live selfie punches.

If you use Claude Code, create a `CLAUDE.md` containing only `@AGENTS.md` so every tool reads the same rules (as far as I know this import syntax is supported; check your tool's docs).

---

## 1. Read in this order

| Order | File | Why |
| :--- | :--- | :--- |
| 1 | `PRD.md` | What the product must do (v1.1, locked MVP) |
| 2 | `docs/architecture.md` | How it is built |
| 3 | `docs/security.md` | Non-negotiable safety rules |
| 4 | `docs/ui.md` | Look, feel, accessibility (red, gold, white) |
| 5 | `docs/attendance-rules.md` | Exact late / undertime / hours math |
| 6 | `docs/database.md`, `docs/api.md` | Conventions and contracts |
| 7 | `docs/testing.md` | What "tested" means here |
| 8 | `docs/tasks/backlog.md` | Your task card |
| Reference | `docs/glossary.md`, `docs/decisions/`, `docs/runbooks/`, `docs/privacy-notice.md` | Look up as needed |

Do not read everything for every card. Read the PRD section, the docs your card names, and `docs/security.md` always.

---

## 2. Stack

Next.js (App Router) + TypeScript strict + Tailwind. Supabase (Postgres, Auth, Storage). Vercel hosting. Zod for validation. Vitest for unit tests, pgTAP for SQL tests, Playwright for end-to-end. Budget is **$0/month**: do not add paid services.

## 3. Commands

Confirm and correct this list after Phase 0 scaffolding, then keep it accurate.

```
npm run dev              # local app
npm run lint
npm run typecheck
npm run test             # unit tests (Vitest)
npm run test:e2e         # Playwright
supabase start           # local Supabase
supabase db reset        # rebuild local DB from migrations + seed
supabase test db         # SQL tests (pgTAP)
supabase migration new <name>
supabase gen types typescript --local > lib/supabase/types.ts
```

A card is not done until lint, typecheck, unit tests, SQL tests and any affected e2e tests pass.

---

## 4. Golden rules

1. **Server decides.** The phone reports location and a photo. The database sets the time, computes distance, and enforces Time In / Time Out rules. Never move a rule into the client.
2. **RLS everywhere.** Deny by default. Never weaken a policy to make something work.
3. **`punches` is append-only.** Corrections go in `punch_adjustments`. Only `punch()` inserts punches.
4. **One source for the math.** Late, undertime and worked minutes live in the `attendance_days` SQL view only.
5. **Service role key** only in `app/api/jobs/*` and `app/api/admin/accounts/*`. Never in client code.
6. **Employee UI is for older users:** 56 px tap targets, 18 px text, one primary action, plain-language messages, status never by color alone. See `docs/ui.md`.
7. **Palette is red, gold, white.** Use the tokens in `docs/ui.md`. No gold text on white.
8. **No secrets, no real employee data** in code, tests, logs or chat.
9. **Small changes.** One card, one branch, one PR.
10. **When the docs are silent or conflict, stop and ask.** Do not guess on money, time or access rules.

---

## 5. Workflow for every card

1. Open your card in `docs/tasks/backlog.md`. Check its **May touch** and **Must not touch** lists.
2. Branch: `card/<id>-<short-slug>` (example: `card/1.3-punch-function`).
3. State your plan in 3-6 lines before coding.
4. Implement with tests in the same PR.
5. Run all checks in section 3.
6. Add one line to `docs/CHANGELOG.md`.
7. Open the PR using the description template below.

### PR description template

```
Card: <id and title>
What changed: <2-4 lines>
How I tested: <commands run, results>
Needs human security review: yes / no   (yes if auth, RLS, storage, punch(), accounts, exports)
Doc updates: <which docs changed, or none>
Open questions: <anything the docs left unclear>
```

---

## 6. Stop and ask the owner before

- Changing the PRD, `docs/architecture.md`, `docs/security.md` or an accepted decision record.
- Adding or changing any RLS policy, storage policy, or the `punch()` function (you may *propose* the change in a PR; a human reviews it).
- Adding a dependency, service or script tag.
- Choosing between the options listed in `docs/decisions/README.md` (open decisions).
- Touching anything related to pay calculation rules.
- Any action against the **prod** Supabase project. Agents work only against `dev`.

## 7. Folder ownership

| Area | Folders | Typical card owner |
| :--- | :--- | :--- |
| Database and security | `supabase/` | Database agent |
| Auth and accounts | `app/(auth)/`, `app/api/admin/accounts/` | Auth agent |
| Employee punch flow | `app/(employee)/`, `lib/geo/`, `lib/image/` | Punch agent |
| Admin dashboards | `app/(admin)/`, `components/admin/` | Admin agent |
| Reports and jobs | `app/api/export/`, `app/api/jobs/`, SQL views | Reports agent |
| Shared UI | `components/ui/` | Any, following `docs/ui.md` |
| Tests | `e2e/`, `supabase/tests/` | QA agent |
| Docs | `docs/` | Architect agent |

Do not edit outside your card's folders without saying so in the PR.

---

## 8. Definition of done (PR level)

- [ ] Acceptance checks on the card pass
- [ ] Tests added for new behavior and for the failure paths
- [ ] Lint, typecheck, unit, SQL and affected e2e tests pass
- [ ] UI changes pass the checklist in `docs/ui.md` section 8
- [ ] Security checklist in `docs/security.md` section 11 passes
- [ ] CHANGELOG line added; docs updated if behavior changed
- [ ] No secrets, no real data, no unrelated changes
