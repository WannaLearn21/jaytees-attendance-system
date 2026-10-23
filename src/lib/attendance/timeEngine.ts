import type { ShiftTemplate } from "@/types/attendance";

export interface AttendanceCalculationResult {
  nominalStart: string;
  nominalEnd: string;
  timeInActual: string;
  timeOutActual: string | null;
  lateMinutes: number;
  undertimeMinutes: number;
  grossDurationHours: number;
  unpaidBreakHours: number;
  netPayableHours: number;
  overtimeHours: number;
  isNightShift: boolean;
  nightDifferentialHours: number;
  isIncomplete: boolean;
  statusNotes: string[];
}

/**
 * Parses time string "HH:mm" into total minutes from midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Calculates late minutes based on PRD v1.1 rules:
 * - If timeIn is within nominalStart + gracePeriodMins, late = 0 (on-time).
 * - Once grace period is breached, lateness is calculated from nominal shift start (retroactive).
 */
export function computeLateMinutes(
  timeIn: Date,
  shift: ShiftTemplate
): number {
  const shiftStartMins = timeStringToMinutes(shift.startTime);
  const timeInMins = timeIn.getHours() * 60 + timeIn.getMinutes();

  const diffMins = timeInMins - shiftStartMins;
  if (diffMins <= shift.gracePeriodMins) {
    return 0; // Within on-time grace tolerance
  }
  return diffMins; // Full tardiness from scheduled start
}

/**
 * Calculates undertime minutes:
 * - If employee times out before scheduled shift end, undertime = scheduledEnd - actualOut.
 * - If employee times out after scheduled end, undertime = 0.
 */
export function computeUndertimeMinutes(
  timeOut: Date,
  shift: ShiftTemplate
): number {
  let shiftEndMins = timeStringToMinutes(shift.endTime);
  const shiftStartMins = timeStringToMinutes(shift.startTime);
  let timeOutMins = timeOut.getHours() * 60 + timeOut.getMinutes();

  // Handle midnight crossing
  if (shiftEndMins < shiftStartMins) {
    shiftEndMins += 24 * 60;
    if (timeOutMins < shiftStartMins) {
      timeOutMins += 24 * 60;
    }
  }

  const diff = shiftEndMins - timeOutMins;
  return diff > 0 ? diff : 0;
}

/**
 * Calculates Philippine Night Shift Differential (NSD):
 * Work performed between 10:00 PM (22:00) and 06:00 AM qualifies for 10% premium.
 */
export function computeNightDifferentialHours(timeIn: Date, timeOut: Date): number {
  let nightMins = 0;
  const current = new Date(timeIn);
  while (current < timeOut) {
    const hour = current.getHours();
    if (hour >= 22 || hour < 6) {
      nightMins += 1;
    }
    current.setMinutes(current.getMinutes() + 1);
  }
  return Number((nightMins / 60).toFixed(2));
}

/**
 * Master Attendance Calculation Engine:
 * Reconciles In/Out timestamps against shift rules, auto-deducts lunch, and flags incomplete punches.
 */
export function calculateAttendanceDay(
  timeIn: Date,
  timeOut: Date | null,
  shift: ShiftTemplate,
  options: {
    autoDeductLunch?: boolean;
    standardLunchMinutes?: number;
    earlyArrivalCredited?: boolean;
  } = {}
): AttendanceCalculationResult {
  const {
    autoDeductLunch = true,
    standardLunchMinutes = 60,
    earlyArrivalCredited = false,
  } = options;

  const notes: string[] = [];

  // 1. Missing Time Out check (flagged incomplete, never auto-closed)
  if (!timeOut) {
    return {
      nominalStart: shift.startTime,
      nominalEnd: shift.endTime,
      timeInActual: timeIn.toISOString(),
      timeOutActual: null,
      lateMinutes: computeLateMinutes(timeIn, shift),
      undertimeMinutes: 0,
      grossDurationHours: 0,
      unpaidBreakHours: 0,
      netPayableHours: 0,
      overtimeHours: 0,
      isNightShift: timeStringToMinutes(shift.endTime) < timeStringToMinutes(shift.startTime) || timeStringToMinutes(shift.startTime) >= 22,
      nightDifferentialHours: 0,
      isIncomplete: true,
      statusNotes: ["Flagged Incomplete: Missing Time Out punch."],
    };
  }

  // 2. Late Minutes
  const lateMinutes = computeLateMinutes(timeIn, shift);
  if (lateMinutes > 0) {
    notes.push(`Late by ${lateMinutes} mins (exceeded ${shift.gracePeriodMins}m grace).`);
  }

  // 3. Undertime Minutes
  const undertimeMinutes = computeUndertimeMinutes(timeOut, shift);
  if (undertimeMinutes > 0) {
    notes.push(`Undertime: Left ${undertimeMinutes} mins before shift end.`);
  }

  // 4. Gross Duration
  const totalElapsedMs = timeOut.getTime() - timeIn.getTime();
  const grossHours = Math.max(0, totalElapsedMs / (1000 * 60 * 60));

  // 5. Unpaid Lunch Deduction (1 hour for shifts >= 5 hours)
  const unpaidBreakHours = autoDeductLunch && grossHours >= 5.0 ? standardLunchMinutes / 60 : 0;
  if (unpaidBreakHours > 0) {
    notes.push(`Auto-deducted ${standardLunchMinutes}m unpaid meal break.`);
  }

  // 6. Net Payable Hours
  // If employee arrives within grace period (late = 0) and works until scheduled end,
  // retail standard grants the full 8.0 nominal regular hours.
  // Otherwise, deduct tardiness and undertime from nominal 8.0h.
  const deductionHours = (lateMinutes + undertimeMinutes) / 60;
  let netHours: number;

  if (lateMinutes === 0 && undertimeMinutes === 0 && !earlyArrivalCredited) {
    netHours = 8.0;
  } else if (!earlyArrivalCredited) {
    netHours = Math.min(grossHours - unpaidBreakHours, 8.0 - deductionHours);
  } else {
    netHours = grossHours - unpaidBreakHours;
  }

  // 7. Overtime Calculation (Threshold: > 8.0 net hours)
  const overtimeHours = netHours > 8.0 ? Number((netHours - 8.0).toFixed(2)) : 0;
  if (overtimeHours > 0) {
    notes.push(`Overtime Flagged: +${overtimeHours} hrs (requires admin approval).`);
  }

  // 8. Overnight & Night Differential
  const isNightShift = timeStringToMinutes(shift.endTime) < timeStringToMinutes(shift.startTime) || timeStringToMinutes(shift.startTime) >= 22;
  const nightDiffHours = computeNightDifferentialHours(timeIn, timeOut);
  if (nightDiffHours > 0) {
    notes.push(`Night Differential (10%): ${nightDiffHours} hrs between 10PM - 6AM.`);
  }

  return {
    nominalStart: shift.startTime,
    nominalEnd: shift.endTime,
    timeInActual: timeIn.toISOString(),
    timeOutActual: timeOut.toISOString(),
    lateMinutes,
    undertimeMinutes,
    grossDurationHours: Number(grossHours.toFixed(2)),
    unpaidBreakHours: Number(unpaidBreakHours.toFixed(2)),
    netPayableHours: Number(Math.max(0, netHours).toFixed(2)),
    overtimeHours,
    isNightShift,
    nightDifferentialHours: nightDiffHours,
    isIncomplete: false,
    statusNotes: notes,
  };
}
