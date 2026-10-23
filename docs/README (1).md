# Decisions

Two things live here: the **open decisions** the owner must make, and the **template** for recording decisions as they are made.

Agents: do not choose between options on an open decision. Build against the proposed default behind a named parameter, say so in your PR, and ask.

---

## 1. Open decisions

| ID | Question | Options | Proposed default | Needed by |
| :--- | :--- | :--- | :--- | :--- |
| D1 | How do employees sign in? | Employee code + PIN / email + password | Employee code + PIN (older staff may have no email) | Phase 2 |
| D2 | How is a shift chosen for each day? | One default template per employee / employee picks at Time In / weekly rota | One default template per employee, Admin can change it | Phase 1 |
| D3 | What does grace mean? | Late counted from shift start once grace is exceeded / counted from end of grace | Counted from shift start (`LATE_COUNTS_FROM = shift_start`) | Phase 4 |
| D4 | Are early arrival minutes paid? | From actual Time In / from scheduled start | From actual Time In, early minutes shown as extra | Phase 4 |
| D5 | Are meal breaks deducted? (no break punches exist) | No deduction / fixed unpaid minutes per shift template | No deduction (`unpaid_break_min = 0`) | Phase 4 |
| D6 | What happens with no signal? | Block the punch with a clear message / queue and sync later | Block (queued punches break time integrity) | Phase 3 |
| D7 | Who approves attendance corrections and forgotten Time Outs? | Branch Admin alone / Admin proposes, SysAd approves | Branch Admin alone, all audit-logged and visible to SysAd | Phase 5 |
| D8 | Can an employee Time In twice on one `shift_date`? | No (new code `SHIFT_ALREADY_COMPLETED`) / yes (split shifts) | No | Phase 1 |
| D9 | Hosting terms for a business app | Vercel Hobby (check commercial-use terms) / paid plan / another free host that allows commercial use | Verify current terms before pilot | Before pilot |
| D10 | Retention for punch rows and who is the data contact | Months or years; named person | Owner decides with advice; photos stay at 60 days | Before pilot |
| D11 | GPS accuracy gate and punch rate-limit window | Numbers per branch | 50 m and a few seconds; tune in the pilot | Pilot |
| D12 | Is the strict three-color palette required, or is a small green status allowed? | Strict / small green for "inside" and success | Small green allowed (`docs/ui.md` section 2) | Phase 0 |

When a decision is made, write a record (section 2), update the affected docs, and change its row here to **Decided** with a link.

---

## 2. Decision record template

Save as `docs/decisions/NNN-short-title.md`.

```
# NNN: <title>

Status: proposed | accepted | superseded by NNN
Date: <yyyy-mm-dd>
Decided by: <name or role>

## Context
<what forced this decision; what options were considered>

## Decision
<what we chose, in one or two sentences>

## Consequences
<what gets easier, what gets harder, which docs and code change>
```

Rules: one decision per file; never delete old records, mark them superseded; link to the record from the doc it changes.

---

## 3. Decisions already taken

See `docs/architecture.md` section 5 (decisions 1-8) and the locked MVP rules in `PRD.md` section 1.2 (Mode C Time Out, personal phones first, Time In/Time Out only, multiple shift templates per branch).
