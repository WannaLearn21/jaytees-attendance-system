# Attendance Rules

The exact math behind **Late (min)**, **Undertime (min)** and **Total Worked Hours**. This is the spec for the `attendance_days` SQL view and its tests. It is the only place these rules are implemented (see `docs/architecture.md`, decision 3).

Pay depends on this file. Items marked **PENDING** need an owner decision (`docs/decisions/README.md`). Until decided, implement them as named parameters with the proposed default, never as hard-coded numbers.

---

## 1. Parameters

| Parameter | Where | Options | Proposed default | Status |
| :--- | :--- | :--- | :--- | :--- |
| `grace_minutes` | `shift_templates` | integer | per template | Decided (PRD) |
| `LATE_COUNTS_FROM` | config | `shift_start` / `grace_end` | `shift_start` | **PENDING** |
| `HOURS_COUNT_FROM` | config | `actual_in` / `scheduled_start` | `actual_in` | **PENDING** |
| `unpaid_break_min` | `shift_templates` (new column if adopted) | integer | `0` (no deduction) | **PENDING** |
| `INCOMPLETE_AFTER_HOURS` | config | integer | `14` | Proposed |
| `VERY_LATE_MIN` | config | integer | `240` | Proposed (flag only) |
| `VERY_EARLY_MIN` | config | integer | `120` | Proposed (flag only) |

If `unpaid_break_min` is adopted it needs a migration and an update to `docs/architecture.md` (owner approval).

---

## 2. Definitions

- All times are stored in UTC and converted to the **branch timezone** for these calculations.
- **Truncate to the minute first.** `tin = floor_to_minute(time_in)` and `tout = floor_to_minute(time_out)`. A Time In at 07:00:59 counts as 07:00.
- **Scheduled window** for a shift on `shift_date`: `scheduled_start = shift_date + start_time`, `scheduled_end = shift_date + end_time` (plus one day if `crosses_midnight`).
- A **day** is one `shift_date` for one employee: one Time In and one Time Out. Split shifts are not supported in MVP.

### Assigning `shift_date`

```
local_in = time_in converted to branch timezone
if template.crosses_midnight and local_in.time_of_day < template.end_time:
    shift_date = local_in.date - 1 day     # in the tail of last night's shift
else:
    shift_date = local_in.date
```

The Time Out inherits `shift_date` from its open Time In. Pair by `shift_date`, never by calendar day.

---

## 3. Formulas

```
late_min:
  if tin <= scheduled_start + grace_minutes:           0          # boundary is inclusive
  elif LATE_COUNTS_FROM = 'shift_start':               tin - scheduled_start
  else ('grace_end'):                                  tin - (scheduled_start + grace_minutes)

undertime_min = max(0, scheduled_end - tout)

raw_worked_min = tout - tin                            # if HOURS_COUNT_FROM = 'actual_in'
               = tout - max(tin, scheduled_start)      # if 'scheduled_start'

worked_min = raw_worked_min - unpaid_break_min   if raw_worked_min > unpaid_break_min
           = raw_worked_min                      otherwise

extra_min  = max(0, scheduled_start - tin) + max(0, tout - scheduled_end)   # informational only
```

- Late and undertime are independent. An employee can be both.
- Working past `scheduled_end` is counted in `worked_min` and shown in `extra_min`. There is no overtime pay logic in MVP.
- All minute values are whole numbers. Hours for display and export: `round(minutes / 60.0, 2)`.

### Flags (set on the day row, for Admin review; never change pay by themselves)

| Flag | When |
| :--- | :--- |
| `very_late` | `late_min` >= `VERY_LATE_MIN` |
| `very_early` | `scheduled_start - tin` >= `VERY_EARLY_MIN` |
| `offsite_out` | Time Out was recorded outside the geofence |
| `adjusted` | An adjustment touches this day |
| `incomplete` | See below |

---

## 4. Special cases

| Case | Rule |
| :--- | :--- |
| **Forgotten Time Out** | If there is a Time In, no Time Out, and `now() > time_in + INCOMPLETE_AFTER_HOURS`, the day is `is_incomplete`. It is **never auto-closed**. `late_min` is still computed; `undertime_min` and `worked_min` are null and excluded from totals. Before the cutoff the status is "working". |
| **Adjustments** | `add` creates a synthetic punch at `adjusted_time`; `void` removes an original punch from the calculation. Recalculate as normal afterwards. The day gets `has_adjustment = true` and the `adjusted` flag. Originals in `punches` are never edited. |
| **Overnight shift** | `crosses_midnight = true`; `scheduled_end` is on the next calendar day. See `shift_date` rule above. |
| **Second Time In on the same `shift_date`** | **PENDING.** MVP supports one in/out pair per `shift_date`. Proposed: reject with a new error code (for example `SHIFT_ALREADY_COMPLETED`). Needs owner approval because it adds an error code. |
| **Absences** | **Not computed in MVP.** The system has no workday or rest-day calendar, so it cannot know a day was missed. Payroll export lists days present only. |
| **Holidays, leave, overtime rates** | Out of scope. |
| **Employee changes shift mid-period** | Each day row stores its own `shift_template_id`, so history is not rewritten. |

---

## 5. Worked examples (use these as the table-driven tests)

Template **Opening**: 07:00-15:00, grace 5 min, `unpaid_break_min = 0`, `HOURS_COUNT_FROM = actual_in`. Times are branch-local.

| # | Time In | Time Out | `LATE_COUNTS_FROM` | late | undertime | worked_min | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 06:56:30 | 15:05:10 | either | 0 | 0 | 489 | Truncated to 06:56 and 15:05. `extra_min` = 4 + 5 = 9 |
| 2 | 07:05 | 15:00 | either | 0 | 0 | 475 | Exactly at the end of grace is not late |
| 3 | 07:06 | 15:00 | `shift_start` | 6 | 0 | 474 | One minute past grace |
| 4 | 07:08 | 15:00 | `shift_start` | 8 | 0 | 472 | |
| 5 | 07:08 | 15:00 | `grace_end` | 3 | 0 | 472 | Same punches, different decision |
| 6 | 07:00 | 14:41 | either | 0 | 19 | 461 | |
| 7 | 07:00:59 | 15:00:00 | either | 0 | 0 | 480 | Seconds truncated |
| 8 | 07:12 | 14:50 | `shift_start` | 12 | 10 | 458 | Late and undertime together |
| 9 | 06:00 | 15:00 | either | 0 | 0 | 540 | `extra_min` 60. Also 06:00 is 60 min early, so no `very_early` flag |
| 10 | 06:00 | 15:00 | either, `HOURS_COUNT_FROM = scheduled_start` | 0 | 0 | 480 | Early hour not counted; `extra_min` still 60 |

Overnight and edge cases, template **Night** 20:00-04:00 (`crosses_midnight`), grace 5:

| # | Time In | Time Out | late | undertime | worked_min | `shift_date` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 11 | Oct 21 20:02 | Oct 22 04:01 | 0 | 0 | 479 | Oct 21 |
| 12 | Oct 22 00:10 (tail) | Oct 22 04:00 | 250 (`shift_start`), flagged `very_late` | 0 | 230 | Oct 21 |

Template **Mid-unpaid** 10:00-18:00, grace 5, `unpaid_break_min = 60` (only if adopted):

| # | Time In | Time Out | late | undertime | worked_min |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 13 | 10:00 | 18:00 | 0 | 0 | 420 |

Incomplete day:

| # | Time In | Time Out | `now()` | Result |
| :--- | :--- | :--- | :--- | :--- |
| 14 | 07:00 | none | 15:00 same day | Status "working", not incomplete |
| 15 | 07:00 | none | 21:30 same day | `is_incomplete`; `worked_min` null; excluded from totals |

---

## 6. Payroll summary (per employee, per period)

| Column | Definition |
| :--- | :--- |
| `employee_code`, `full_name`, `branch` | From `profiles` and `branches` |
| `days_present` | Count of complete days (Time In and Time Out) in the period by `shift_date` |
| `total_hours` | `round(sum(worked_min) / 60.0, 2)` over complete days |
| `late_min` | Sum of `late_min` over all days with a Time In (incomplete days included) |
| `undertime_min` | Sum of `undertime_min` over complete days |
| `incomplete_days` | Count of incomplete days (needs Admin correction before payroll) |

Periods are selected by `shift_date`, not by punch timestamp, so an overnight shift stays in the period where it started.

---

## 7. Implementation notes

- Implement as a SQL view (`security_invoker = true`) built on a function that takes the parameters above, so tests can run both decision values.
- Keep every threshold in one `app_config` mechanism (table or SQL function), not scattered literals.
- Any change to these rules needs: owner approval, updated examples here, updated tests, and a CHANGELOG note, because it changes what people are paid.
