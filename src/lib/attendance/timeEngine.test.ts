import {
  calculateAttendanceDay,
  computeLateMinutes,
  computeUndertimeMinutes,
  computeNightDifferentialHours,
} from "./timeEngine";
import type { ShiftTemplate } from "@/types/attendance";

const openingShift: ShiftTemplate = {
  id: "shift-open",
  branchId: "branch-1",
  name: "Opening Shift",
  badgeText: "Morning Front",
  description: "Store setup",
  startTime: "07:00",
  endTime: "16:00",
  gracePeriodMins: 15,
};

const closingShift: ShiftTemplate = {
  id: "shift-close",
  branchId: "branch-1",
  name: "Closing Shift",
  badgeText: "Night Lockup",
  description: "Night close",
  startTime: "13:00",
  endTime: "22:00",
  gracePeriodMins: 10,
};

const overnightShift: ShiftTemplate = {
  id: "shift-overnight",
  branchId: "branch-1",
  name: "Midnight Cleaning Shift",
  badgeText: "Graveyard",
  description: "Crosses midnight",
  startTime: "22:00",
  endTime: "07:00",
  gracePeriodMins: 10,
};

function createDateTime(hours: number, minutes: number, dayOffset = 0): Date {
  const d = new Date(2026, 9, 23 + dayOffset, hours, minutes, 0, 0);
  return d;
}

interface TestCase {
  title: string;
  run: () => boolean;
}

const tests: TestCase[] = [
  // 1-5: On-time & Grace Boundary tests
  {
    title: "1. Time In precisely at shift start (07:00) -> 0 late mins",
    run: () => {
      const late = computeLateMinutes(createDateTime(7, 0), openingShift);
      return late === 0;
    },
  },
  {
    title: "2. Time In within 15m grace window (07:12) -> 0 late mins",
    run: () => {
      const late = computeLateMinutes(createDateTime(7, 12), openingShift);
      return late === 0;
    },
  },
  {
    title: "3. Time In at exact grace cutoff (07:15) -> 0 late mins",
    run: () => {
      const late = computeLateMinutes(createDateTime(7, 15), openingShift);
      return late === 0;
    },
  },
  {
    title: "4. Time In past grace cutoff (07:16) -> 16 minutes late (retroactive from start)",
    run: () => {
      const late = computeLateMinutes(createDateTime(7, 16), openingShift);
      return late === 16;
    },
  },
  {
    title: "5. Time In 35m late (07:35) -> 35 minutes late",
    run: () => {
      const late = computeLateMinutes(createDateTime(7, 35), openingShift);
      return late === 35;
    },
  },

  // 6-10: Undertime tests
  {
    title: "6. Time Out on exact schedule (16:00) -> 0 undertime mins",
    run: () => {
      const under = computeUndertimeMinutes(createDateTime(16, 0), openingShift);
      return under === 0;
    },
  },
  {
    title: "7. Time Out after scheduled end (16:25) -> 0 undertime mins (no negative undertime)",
    run: () => {
      const under = computeUndertimeMinutes(createDateTime(16, 25), openingShift);
      return under === 0;
    },
  },
  {
    title: "8. Time Out 45m early (15:15) -> 45 minutes undertime",
    run: () => {
      const under = computeUndertimeMinutes(createDateTime(15, 15), openingShift);
      return under === 45;
    },
  },
  {
    title: "9. Time Out 2 hours early (14:00) -> 120 minutes undertime",
    run: () => {
      const under = computeUndertimeMinutes(createDateTime(14, 0), openingShift);
      return under === 120;
    },
  },
  {
    title: "10. Closing shift time out early (21:30) -> 30 minutes undertime",
    run: () => {
      const under = computeUndertimeMinutes(createDateTime(21, 30), closingShift);
      return under === 30;
    },
  },

  // 11-15: Unpaid Meal Break & Net Hours
  {
    title: "11. Full 9h shift (07:00 - 16:00) auto-deducts 60m meal -> 8.00 net payable hours",
    run: () => {
      const res = calculateAttendanceDay(createDateTime(7, 0), createDateTime(16, 0), openingShift);
      return res.unpaidBreakHours === 1.0 && res.netPayableHours === 8.0;
    },
  },
  {
    title: "12. Arrived early (06:40) without OT auth -> capped at 8.00 net regular hours",
    run: () => {
      const res = calculateAttendanceDay(createDateTime(6, 40), createDateTime(16, 0), openingShift);
      return res.netPayableHours === 8.0;
    },
  },
  {
    title: "13. Late by 30 mins (07:30 - 16:00) -> 0.5h tardy, 7.50 net payable hours",
    run: () => {
      const res = calculateAttendanceDay(createDateTime(7, 30), createDateTime(16, 0), openingShift);
      return res.lateMinutes === 30 && res.netPayableHours === 7.5;
    },
  },
  {
    title: "14. Late by 15m (within grace) + left on time -> 0 deduction, 8.00 net payable hours",
    run: () => {
      const res = calculateAttendanceDay(createDateTime(7, 15), createDateTime(16, 0), openingShift);
      return res.lateMinutes === 0 && res.netPayableHours === 8.0;
    },
  },
  {
    title: "15. Both late 30m and undertime 30m -> 1.0h total deduction, 7.00 net payable hours",
    run: () => {
      const res = calculateAttendanceDay(createDateTime(7, 30), createDateTime(15, 30), openingShift);
      return res.lateMinutes === 30 && res.undertimeMinutes === 30 && res.netPayableHours === 7.0;
    },
  },

  // 16-20: Missing Time Out (Edge Cases)
  {
    title: "16. Missing Time Out (null) -> flagged isIncomplete = true, netPayableHours = 0",
    run: () => {
      const res = calculateAttendanceDay(createDateTime(7, 0), null, openingShift);
      return res.isIncomplete === true && res.netPayableHours === 0 && res.timeOutActual === null;
    },
  },
  {
    title: "17. Incomplete punch includes tardiness penalty note if late on in-punch",
    run: () => {
      const res = calculateAttendanceDay(createDateTime(7, 35), null, openingShift);
      return res.isIncomplete === true && res.lateMinutes === 35;
    },
  },
  {
    title: "18. Short shift under 5 hours (07:00 - 11:00) -> 0 meal break deducted",
    run: () => {
      const res = calculateAttendanceDay(createDateTime(7, 0), createDateTime(11, 0), openingShift);
      return res.unpaidBreakHours === 0;
    },
  },
  {
    title: "19. Overtime flagged when shift extends past scheduled end (> 8 net hrs with auth)",
    run: () => {
      const res = calculateAttendanceDay(createDateTime(7, 0), createDateTime(18, 0), openingShift, {
        earlyArrivalCredited: true,
      });
      return res.overtimeHours === 2.0 && res.netPayableHours === 10.0;
    },
  },
  {
    title: "20. Exact 8.0h net work does not trigger overtime flag",
    run: () => {
      const res = calculateAttendanceDay(createDateTime(7, 0), createDateTime(16, 0), openingShift);
      return res.overtimeHours === 0;
    },
  },

  // 21-25: Overnight Shifts & Philippine Night Shift Differential (NSD)
  {
    title: "21. Closing Shift (13:00 - 22:00) ending at 22:00 -> 0 night differential hours",
    run: () => {
      const diff = computeNightDifferentialHours(createDateTime(13, 0), createDateTime(22, 0));
      return diff === 0;
    },
  },
  {
    title: "22. Closing shift overtime into night (13:00 - 23:30) -> 1.50 night differential hours",
    run: () => {
      const diff = computeNightDifferentialHours(createDateTime(13, 0), createDateTime(23, 30));
      return diff === 1.5;
    },
  },
  {
    title: "23. Overnight shift crossing midnight (22:00 - 07:00 next day) -> 8.00 night differential hours (22:00 to 06:00)",
    run: () => {
      const diff = computeNightDifferentialHours(createDateTime(22, 0), createDateTime(7, 0, 1));
      return diff === 8.0;
    },
  },
  {
    title: "24. Overnight shift full calculation -> flagged isNightShift = true, 8h NSD",
    run: () => {
      const res = calculateAttendanceDay(createDateTime(22, 0), createDateTime(7, 0, 1), overnightShift);
      return res.isNightShift === true && res.nightDifferentialHours === 8.0;
    },
  },
  {
    title: "25. Midnight crossing undertime calculation (left at 05:00 instead of 07:00 next day) -> 120m undertime",
    run: () => {
      const under = computeUndertimeMinutes(createDateTime(5, 0, 1), overnightShift);
      return under === 120;
    },
  },
];

export function runTimeEngineTests(): { passed: number; total: number; failures: string[] } {
  let passed = 0;
  const failures: string[] = [];

  for (const t of tests) {
    try {
      const ok = t.run();
      if (ok) {
        passed++;
      } else {
        failures.push(t.title);
      }
    } catch (e: any) {
      failures.push(`${t.title} [Threw Error: ${e.message}]`);
    }
  }

  return { passed, total: tests.length, failures };
}
