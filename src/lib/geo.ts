import { Branch, Employee } from "@/types/attendance";

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the great-circle distance in meters between two GPS coordinates using the Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

export interface VicinityEvaluation {
  targetBranch: Branch;
  distanceMeters: number;
  allowedRadiusMeters: number;
  isInsideVicinity: boolean;
  canTimeIn: boolean;
  timeInReason: string;
  canTimeOut: boolean;
  isOffsiteModeCTimeOut: boolean;
  timeOutReason: string;
}

/**
 * Evaluates whether the employee can Time In and Time Out at their current GPS coordinates.
 * Enforces:
 * 1. Time In: Must be inside branch vicinity for ALL employees.
 * 2. Time Out (Mode C — Role-Based Flexible):
 *    - Inside vicinity: Allowed for all employees.
 *    - Outside vicinity: Allowed ONLY if employee.allowOffsiteTimeout === true (or role === 'SYSAD').
 */
export function evaluateVicinityAndModeC(
  userLat: number,
  userLng: number,
  employee: Employee,
  branches: Branch[]
): VicinityEvaluation {
  const activeBranches = branches.filter((b) => b.isActive);
  const assignedBranch =
    branches.find((b) => b.id === employee.branchId) || activeBranches[0] || branches[0];

  let targetBranch = assignedBranch;
  let distanceMeters = calculateDistanceMeters(
    userLat,
    userLng,
    assignedBranch.latitude,
    assignedBranch.longitude
  );

  // If employee is a multi-branch reliever or SysAd, check if they are closer to another active branch
  if (employee.allowMultiBranch || employee.role === "SYSAD") {
    for (const branch of activeBranches) {
      const dist = calculateDistanceMeters(
        userLat,
        userLng,
        branch.latitude,
        branch.longitude
      );
      if (dist < distanceMeters) {
        distanceMeters = dist;
        targetBranch = branch;
      }
    }
  }

  const allowedRadiusMeters = targetBranch.radiusMeters;
  const isInsideVicinity = distanceMeters <= allowedRadiusMeters;

  // TIME IN RULE: Strict branch vicinity for everyone
  const canTimeIn = isInsideVicinity;
  const timeInReason = isInsideVicinity
    ? `Inside ${targetBranch.name} vicinity (${distanceMeters}m / ${allowedRadiusMeters}m allowed)`
    : `Outside ${targetBranch.name} vicinity (${distanceMeters}m away — must be within ${allowedRadiusMeters}m to Time In)`;

  // TIME OUT RULE: Mode C (Role-Based Flexible)
  let canTimeOut = false;
  let isOffsiteModeCTimeOut = false;
  let timeOutReason = "";

  if (isInsideVicinity) {
    canTimeOut = true;
    isOffsiteModeCTimeOut = false;
    timeOutReason = `Inside ${targetBranch.name} vicinity (${distanceMeters}m) — Standard In-Branch Time Out`;
  } else if (employee.allowOffsiteTimeout) {
    canTimeOut = true;
    isOffsiteModeCTimeOut = true;
    timeOutReason = `Mode C Authorized: Off-site Time Out permitted for your role (${distanceMeters}m from ${targetBranch.name})`;
  } else {
    canTimeOut = false;
    isOffsiteModeCTimeOut = false;
    timeOutReason = `Blocked by Mode C Store Policy: Standard in-store staff must be within ${allowedRadiusMeters}m of ${targetBranch.name} to Time Out (currently ${distanceMeters}m away)`;
  }

  return {
    targetBranch,
    distanceMeters,
    allowedRadiusMeters,
    isInsideVicinity,
    canTimeIn,
    timeInReason,
    canTimeOut,
    isOffsiteModeCTimeOut,
    timeOutReason,
  };
}

/**
 * Calculates Late Minutes given a punch ISO timestamp, shift start "HH:mm", and grace period in minutes.
 */
export function calculateLateMinutes(
  timeInIso: string,
  shiftStart24h: string,
  gracePeriodMins: number
): number {
  const punchDate = new Date(timeInIso);
  const [startHour, startMin] = shiftStart24h.split(":").map(Number);

  const scheduledStart = new Date(punchDate);
  scheduledStart.setHours(startHour, startMin, 0, 0);

  const diffMs = punchDate.getTime() - scheduledStart.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins > gracePeriodMins) {
    return diffMins;
  }
  return 0;
}

/**
 * Calculates Undertime Minutes and Total Hours between Time In and Time Out.
 */
export function calculateUndertimeAndHours(
  timeInIso: string,
  timeOutIso: string,
  shiftEnd24h: string
): { undertimeMinutes: number; totalHours: number } {
  const inDate = new Date(timeInIso);
  const outDate = new Date(timeOutIso);

  const durationMs = Math.max(0, outDate.getTime() - inDate.getTime());
  const totalHours = Number((durationMs / (1000 * 60 * 60)).toFixed(2));

  const [endHour, endMin] = shiftEnd24h.split(":").map(Number);
  const scheduledEnd = new Date(outDate);
  scheduledEnd.setHours(endHour, endMin, 0, 0);

  const earlyMs = scheduledEnd.getTime() - outDate.getTime();
  const undertimeMinutes = earlyMs > 0 ? Math.floor(earlyMs / 60000) : 0;

  return { undertimeMinutes, totalHours };
}

/**
 * Formats a 24-hour time string ("08:00" or "17:30") into readable 12-hour format ("8:00 AM").
 */
export function formatTime12h(time24h: string): string {
  const [hStr, mStr] = time24h.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (isNaN(h) || isNaN(m)) return time24h;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
