export type AccessRole = "SYSAD" | "ADMIN" | "USER";

export interface Branch {
  id: string;
  branchCode: string; // e.g., "JTS-HQ-01"
  shortName: string;  // e.g., "Main"
  name: string;       // e.g., "Jaytees Flagship / Main Store"
  address: string;
  ssid: string;       // e.g., "Jaytees_HQ_5G"
  latitude: number;
  longitude: number;
  radiusMeters: number;
  assignedHeadcount: number;
  presentHeadcount: number;
  isActive: boolean;
}

export interface ShiftTemplate {
  id: string;
  branchId: string;
  name: string;        // "Opening Shift" | "Mid Shift" | "Closing Shift"
  badgeText: string;   // "Morning Front" | "Peak Volume" | "Night Lockup"
  description: string;
  startTime: string;   // "07:00"
  endTime: string;     // "16:00"
  gracePeriodMins: number;
}

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  designation: string;
  role: AccessRole;
  branchId: string;
  shiftId: string;
  allowOffsiteTimeout: boolean; // Mode C Flag
  allowMultiBranch: boolean;
  pinCode: string;
  avatarUrl: string;
  daysPresent?: number;
  regularHours?: number;
  isActive: boolean;
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
  dateKey: string;
  timeInAt: string;
  timeInLat: number;
  timeInLng: number;
  timeInDistanceM: number;
  timeInPhotoData: string;
  lateMinutes: number;
  timeOutAt?: string;
  timeOutLat?: number;
  timeOutLng?: number;
  timeOutDistanceM?: number;
  timeOutPhotoData?: string;
  isOffsiteTimeout: boolean;
  offsiteNote?: string;
  undertimeMinutes: number;
  totalHours: number;
  statusFlag?: "IN_GEOFENCE" | "MODE_C_APPROVED" | "OUTSIDE_FLAGGED";
  reviewedByAdmin?: boolean;
}

export interface GpsPosition {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  isSimulated: boolean;
  label: string;
}

export interface AuditLogEntry {
  id: string;
  tableName: string;
  recordId: string;
  action: "INSERT" | "UPDATE" | "CORRECTION" | "PURGE";
  changedBy: string;
  changedByName: string;
  branchId?: string;
  reason: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  createdAt: string;
}

