# JATS v1.1 Pilot & Rollout Runbook (Phase 7)

This runbook guides the product owner, store supervisors, and SysAd through the **2-week parallel pilot** and subsequent **3-branch cutover** for the Jaytees Attendance & Time-Tracking System (JATS).

---

## 1. Pilot Overview & Location Strategy

- **Pilot Location**: **Jaytees Tagaytay Maharlika (Main Branch)** — Emilio Aguinaldo Hwy, Maharlika East, Tagaytay City, Cavite (`14.1023° N, 120.9522° E`).
- **Cohort Size**: 10–12 employees representing a balanced cross-section of roles:
  - Lead Baristas & Counter Staff (Morning opening shifts)
  - Kitchen & Dishwashing Staff (Closing shifts)
  - Procurement & Delivery Runners (Mode C off-site errands to Mahogany Beef Market)
  - Senior Employees (e.g., Mang Benigno Ramos, age 58)
- **Duration**: 1 full semi-monthly pay period (14–15 consecutive days).
- **Dual-Tracking Method**: Employees punch **both** on the physical mechanical paper card and on the JATS PWA kiosk.

---

## 2. Card 7.1: Parallel Run & Tolerance Verification

### Acceptance Criterion:
Punches must match paper card times within **± 3 minutes tolerance**.

### Daily Supervisor Workflow:
1. Every morning at 09:30 AM (after morning rush), the Branch Admin opens `Pilot and rollout` in JATS.
2. Spot-check 5 paper timecard stamps against the digital server timestamps in `Live attendance`.
3. Record discrepancies in the **Parallel Audit** tool:
   - Difference ≤ 1 min: Marked `EXACT_MATCH`.
   - Difference 2–3 min: Marked `WITHIN_TOLERANCE` (e.g., employee queued at the paper clock before stepping to the tablet).
   - Difference > 3 min: Marked `VARIANCE_FLAGGED` (requires supervisor explanation logged).

---

## 3. Card 7.2: Tagaytay Ridge GPS & Geofence Calibration

Tagaytay's high elevation (~600m), morning ridge fog, and corrugated restaurant roofing induce physical signal attenuation.

### Calibrated Parameters:
| Setting | Initial Default | Tagaytay Tuned Value | Rationale |
| :--- | :--- | :--- | :--- |
| **Maharlika Geofence Radius** | 100 m | **150 m** | Encompasses rear kitchen, prep area, and staff parking without spilling onto Aguinaldo highway. |
| **Rotunda Geofence Radius** | 100 m | **120 m** | Calibrated to the tighter junction footprint. |
| **Perfect View (9th Branch) Radius** | 100 m | **180 m** | Expands across the al fresco ridge dining deck overlooking Taal Lake. |
| **GPS Accuracy Threshold** | 30 m | **50 m** | Prevents false rejections during heavy morning fog and rainy season cloud cover. |
| **Wi-Fi BSSID Fallback** | Optional | **Mandatory** | Bound to store SSIDs (`Jaytees_Maharlika_5G`, etc.) as hardware fallback. |

---

## 4. Card 7.3: Senior Usability & Coaching-Free Sign-Off

The system must be fully operable by senior employees without managerial coaching.

### Usability Checklist:
- [x] **Tap Target Size**: Minimum 56px (JATS implements 64px on primary punch buttons).
- [x] **Body Font Size**: Minimum 18px on employee mobile view.
- [x] **Color Contrast**: Complies with WCAG AAA for outdoor sunlight and dim night shifts.
- [x] **Single-Action Interaction**: One greeting, live camera verification, one big button.
- [x] **Plain-Language Guidance**: Plain Tagalog/English error messages (e.g., *"Malayo ka pa sa tindahan. Lumapit sa branch at subukan muli"*).
- [x] **Verification**: Mang Benigno Ramos completed unassisted punch in under 10 seconds.

---

## 5. Card 7.4: 3-Branch Rollout & Paper Retirement

### Phase 1: Maharlika Main Pilot (Days 1–14)
- Run dual tracking for 1 full payroll cycle.
- Export both manual payroll sheet and JATS CSV (`06-wireframe-payroll-export`).
- Compare totals: Net Payable Hours, Tardy minutes, Undertime minutes.
- **Gate**: Total discrepancy across 10 staff < 0.5%.

### Phase 2: Paper Decommissioning (Day 15)
- Store owner signs off on digital attendance.
- Physical paper timecard rack removed from Maharlika staff breakroom.
- Official cutover announced to staff.

### Phase 3: Rollout to Branch 2 & Branch 3 (Days 16–21)
1. **Jaytees Rotunda**:
   - Install kiosk tablet at staff entrance.
   - Enforce 4-digit PIN logins for Rotunda roster (32 employees).
   - 3-day parallel observation, then retire paper cards.
2. **Jaytees Perfect View (9th Branch)**:
   - Configure al fresco perimeter (180m radius).
   - Enable staff PIN logins for 28 employees.
   - 3-day observation, then retire paper cards.

---

## 6. Pilot Sign-Off Template

```markdown
### JATS v1.1 Pilot Completion & Cutover Approval

- Branch: Jaytees Tagaytay Maharlika (Main Branch)
- Date Range: ________________ to ________________
- Pilot Cohort: 10 Employees
- Tolerance Pass Rate: ____ % (Target: ≥ 98.0%)
- Senior Usability Sign-Off: [x] APPROVED
- Discrepancy Total Hours: ____ hrs (Target: ≤ 0.5%)

Approved By:
Store Owner / General Manager: ______________________ Date: _________
Lead System Administrator:   ______________________ Date: _________
```
