"use client";

import React, { useRef, useState } from "react";
import {
  AttendanceLog,
  Branch,
  Employee,
  GpsPosition,
  ShiftTemplate,
} from "@/types/attendance";
import {
  calculateLateMinutes,
  calculateUndertimeAndHours,
  evaluateVicinityAndModeC,
  formatTime12h,
} from "@/lib/geo";
import { CameraCapture, CameraCaptureHandle } from "./CameraCapture";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  MapPin,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from "lucide-react";

interface EmployeeTerminalProps {
  employee: Employee;
  branches: Branch[];
  shifts: ShiftTemplate[];
  logs: AttendanceLog[];
  currentGps: GpsPosition;
  currentTime: Date;
  onRecordTimeIn: (newLog: AttendanceLog) => void;
  onRecordTimeOut: (updatedLog: AttendanceLog) => void;
}

export function EmployeeTerminal({
  employee,
  branches,
  shifts,
  logs,
  currentGps,
  currentTime,
  onRecordTimeIn,
  onRecordTimeOut,
}: EmployeeTerminalProps) {
  const cameraRef = useRef<CameraCaptureHandle | null>(null);
  const [offsiteNote, setOffsiteNote] = useState("");
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const todayKey = currentTime.toISOString().slice(0, 10);

  // Find employee's assigned shift template
  const assignedShift =
    shifts.find((s) => s.id === employee.shiftId) ||
    shifts.find((s) => s.branchId === employee.branchId) ||
    shifts[0];

  // Evaluate geofence distance & Mode C eligibility
  const vicinity = evaluateVicinityAndModeC(
    currentGps.latitude,
    currentGps.longitude,
    employee,
    branches
  );

  // Check if employee already has an active or completed attendance log today
  const myLogs = logs.filter((l) => l.employeeId === employee.id);
  const todayLog = myLogs.find((l) => l.dateKey === todayKey);
  const hasTimedInToday = Boolean(todayLog);
  const hasTimedOutToday = Boolean(todayLog?.timeOutAt);

  const handleTimeIn = () => {
    setFeedbackBanner(null);

    if (!vicinity.canTimeIn) {
      setFeedbackBanner({
        type: "error",
        title: "Cannot Time In Outside Branch Vicinity",
        message: vicinity.timeInReason,
      });
      return;
    }

    const photoData =
      cameraRef.current?.capturePhoto({
        actionLabel: "TIME IN",
        employeeCode: employee.employeeCode,
        employeeName: employee.fullName,
        branchName: vicinity.targetBranch.name,
        distanceMeters: vicinity.distanceMeters,
        lat: currentGps.latitude,
        lng: currentGps.longitude,
      }) || "";

    const nowIso = new Date().toISOString();
    const lateMins = calculateLateMinutes(
      nowIso,
      assignedShift.startTime,
      assignedShift.gracePeriodMins
    );

    const newLog: AttendanceLog = {
      id: `log-${Date.now()}`,
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      employeeName: employee.fullName,
      branchId: vicinity.targetBranch.id,
      branchName: vicinity.targetBranch.name,
      shiftName: assignedShift.name,
      shiftStart: assignedShift.startTime,
      shiftEnd: assignedShift.endTime,
      dateKey: todayKey,
      timeInAt: nowIso,
      timeInLat: currentGps.latitude,
      timeInLng: currentGps.longitude,
      timeInDistanceM: vicinity.distanceMeters,
      timeInPhotoData: photoData,
      lateMinutes: lateMins,
      isOffsiteTimeout: false,
      undertimeMinutes: 0,
      totalHours: 0,
    };

    onRecordTimeIn(newLog);
    setFeedbackBanner({
      type: "success",
      title: "TIME IN RECORDED SUCCESSFULLY!",
      message: `Clocked in at ${vicinity.targetBranch.name} (${vicinity.distanceMeters}m away). ${
        lateMins > 0
          ? `Marked Late by ${lateMins} mins.`
          : "You are ON TIME for your shift!"
      }`,
    });
  };

  const handleTimeOut = () => {
    setFeedbackBanner(null);
    if (!todayLog) return;

    if (!vicinity.canTimeOut) {
      setFeedbackBanner({
        type: "error",
        title: "Time Out Blocked (In-Store Policy)",
        message: vicinity.timeOutReason,
      });
      return;
    }

    const photoData =
      cameraRef.current?.capturePhoto({
        actionLabel: "TIME OUT",
        employeeCode: employee.employeeCode,
        employeeName: employee.fullName,
        branchName: vicinity.isInsideVicinity
          ? vicinity.targetBranch.name
          : `Off-Site (${vicinity.distanceMeters}m from ${vicinity.targetBranch.name})`,
        distanceMeters: vicinity.distanceMeters,
        lat: currentGps.latitude,
        lng: currentGps.longitude,
      }) || "";

    const nowIso = new Date().toISOString();
    const { undertimeMinutes, totalHours } = calculateUndertimeAndHours(
      todayLog.timeInAt,
      nowIso,
      todayLog.shiftEnd
    );

    const updatedLog: AttendanceLog = {
      ...todayLog,
      timeOutAt: nowIso,
      timeOutLat: currentGps.latitude,
      timeOutLng: currentGps.longitude,
      timeOutDistanceM: vicinity.distanceMeters,
      timeOutPhotoData: photoData,
      isOffsiteTimeout: !vicinity.isInsideVicinity,
      offsiteNote: !vicinity.isInsideVicinity
        ? offsiteNote.trim() || "Authorized Mode C Off-Site Time Out"
        : undefined,
      undertimeMinutes,
      totalHours,
    };

    onRecordTimeOut(updatedLog);
    setOffsiteNote("");
    setFeedbackBanner({
      type: "success",
      title: "TIME OUT RECORDED SUCCESSFULLY!",
      message: !vicinity.isInsideVicinity
        ? `Logged via Mode C Off-Site Authorization (${vicinity.distanceMeters}m from branch). Total shift: ${totalHours} hrs.`
        : `Clocked out inside ${vicinity.targetBranch.name}. Total shift: ${totalHours} hrs.`,
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Senior-Friendly Top Employee & Live Clock Card */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-sky-500/20 px-3 py-1 text-sm font-bold text-sky-300 border border-sky-500/30">
                {employee.employeeCode}
              </span>
              <span
                className={`rounded-lg px-3 py-1 text-xs font-bold border ${
                  employee.allowOffsiteTimeout
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                }`}
              >
                {employee.allowOffsiteTimeout
                  ? "Mode C: Off-Site Time Out Allowed"
                  : "Mode C: In-Store Time Out Only"}
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
              {employee.fullName}
            </h2>
            <p className="mt-1 text-base font-medium text-slate-300">
              Assigned Shift:{" "}
              <span className="font-bold text-sky-300">
                {assignedShift.name} ({formatTime12h(assignedShift.startTime)} –{" "}
                {formatTime12h(assignedShift.endTime)})
              </span>{" "}
              • Grace: {assignedShift.gracePeriodMins}m
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-left sm:text-right">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 sm:justify-end">
              <Clock className="h-4 w-4" />
              <span>Official Server Time</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-black text-white sm:text-3xl">
              {currentTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
            <div className="text-xs font-medium text-slate-400">
              {currentTime.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* High-Contrast GPS Vicinity Banner */}
        <div
          className={`mt-5 flex flex-col gap-2 rounded-xl border-2 p-4 sm:flex-row sm:items-center sm:justify-between ${
            vicinity.isInsideVicinity
              ? "border-emerald-500/60 bg-emerald-950/50 text-emerald-100"
              : employee.allowOffsiteTimeout && hasTimedInToday && !hasTimedOutToday
              ? "border-amber-500/60 bg-amber-950/50 text-amber-100"
              : "border-rose-500/60 bg-rose-950/50 text-rose-100"
          }`}
        >
          <div className="flex items-start gap-3">
            <MapPin
              className={`mt-0.5 h-7 w-7 shrink-0 ${
                vicinity.isInsideVicinity
                  ? "text-emerald-400"
                  : employee.allowOffsiteTimeout && hasTimedInToday
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            />
            <div>
              <div className="text-lg font-extrabold">
                {vicinity.isInsideVicinity
                  ? `INSIDE STORE VICINITY: ${vicinity.targetBranch.name}`
                  : `OUTSIDE STORE VICINITY (${vicinity.distanceMeters}m from ${vicinity.targetBranch.name})`}
              </div>
              <p className="text-sm opacity-90">
                {!hasTimedInToday
                  ? vicinity.timeInReason
                  : !hasTimedOutToday
                  ? vicinity.timeOutReason
                  : "Shift completed for today. Thank you for your hard work!"}
              </p>
            </div>
          </div>
          <div className="shrink-0 rounded-lg bg-slate-950/80 px-3 py-2 text-center font-mono text-sm font-bold">
            Distance: {vicinity.distanceMeters}m
            <span className="block text-[11px] font-normal text-slate-400">
              Max Radius: {vicinity.allowedRadiusMeters}m
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Alert Banner */}
      {feedbackBanner && (
        <div
          className={`flex items-start gap-3 rounded-2xl border-2 p-4 shadow-lg ${
            feedbackBanner.type === "success"
              ? "border-emerald-500 bg-emerald-950/80 text-emerald-100"
              : "border-rose-500 bg-rose-950/80 text-rose-100"
          }`}
        >
          {feedbackBanner.type === "success" ? (
            <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-400" />
          ) : (
            <ShieldAlert className="h-7 w-7 shrink-0 text-rose-400" />
          )}
          <div>
            <h3 className="text-lg font-extrabold">{feedbackBanner.title}</h3>
            <p className="mt-0.5 text-sm">{feedbackBanner.message}</p>
          </div>
        </div>
      )}

      {/* Main Camera + Senior-Friendly Giant Action Section */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Left: Live Camera Viewfinder */}
        <div className="md:col-span-7">
          <CameraCapture
            ref={cameraRef}
            employeeName={employee.fullName}
            employeeCode={employee.employeeCode}
            branchName={vicinity.targetBranch.name}
            distanceMeters={vicinity.distanceMeters}
            isInsideVicinity={vicinity.isInsideVicinity}
          />
        </div>

        {/* Right: Giant Senior-Friendly TIME IN / TIME OUT Controls */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl md:col-span-5">
          <div className="space-y-4">
            <h3 className="text-xl font-extrabold text-white">
              Digital Time Card Terminal
            </h3>
            <p className="text-sm text-slate-300">
              Look at the camera and tap the large button below. Only{" "}
              <strong className="text-white">Time In</strong> and{" "}
              <strong className="text-white">Time Out</strong> are needed.
            </p>

            {/* Step 1: TIME IN STATUS / BUTTON */}
            {!hasTimedInToday ? (
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleTimeIn}
                  disabled={!vicinity.canTimeIn}
                  className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 px-6 py-7 text-center font-black shadow-xl transition-all ${
                    vicinity.canTimeIn
                      ? "border-emerald-400 bg-emerald-600 text-white hover:bg-emerald-500 active:scale-[0.99] cursor-pointer"
                      : "border-slate-700 bg-slate-800/70 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <LogIn className="h-10 w-10" />
                  <span className="text-2xl tracking-wide">
                    TAP TO TIME IN
                  </span>
                  <span className="text-xs font-semibold opacity-90">
                    {vicinity.canTimeIn
                      ? `Takes Live Selfie at ${vicinity.targetBranch.name}`
                      : `Move within ${vicinity.allowedRadiusMeters}m of store to enable`}
                  </span>
                </button>
              </div>
            ) : (
              /* Already Timed In Today — Show Time In Badge */
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-emerald-400">
                    ✓ Timed In Today
                  </span>
                  <span className="font-mono text-sm font-bold text-white">
                    {new Date(todayLog!.timeInAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  {todayLog!.branchName} ({todayLog!.timeInDistanceM}m) •{" "}
                  {todayLog!.lateMinutes > 0
                    ? `Late: ${todayLog!.lateMinutes} mins`
                    : "On Time"}
                </p>
              </div>
            )}

            {/* Step 2: TIME OUT STATUS / BUTTON */}
            {hasTimedInToday && !hasTimedOutToday && (
              <div className="space-y-3 pt-2">
                {/* If outside vicinity & employee is Mode C authorized, show optional errand note field */}
                {!vicinity.isInsideVicinity && employee.allowOffsiteTimeout && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-3">
                    <label className="block text-xs font-bold uppercase text-amber-300">
                      Mode C Off-Site Location / Errand Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={offsiteNote}
                      onChange={(e) => setOffsiteNote(e.target.value)}
                      placeholder="e.g., Finished supplier pickup / delivery"
                      className="mt-1.5 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleTimeOut}
                  disabled={!vicinity.canTimeOut}
                  className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 px-6 py-7 text-center font-black shadow-xl transition-all ${
                    !vicinity.canTimeOut
                      ? "border-slate-700 bg-slate-800/70 text-slate-400 cursor-not-allowed"
                      : vicinity.isInsideVicinity
                      ? "border-sky-400 bg-sky-600 text-white hover:bg-sky-500 active:scale-[0.99] cursor-pointer"
                      : "border-amber-400 bg-amber-600 text-white hover:bg-amber-500 active:scale-[0.99] cursor-pointer"
                  }`}
                >
                  <LogOut className="h-10 w-10" />
                  <span className="text-2xl tracking-wide">
                    TAP TO TIME OUT
                  </span>
                  <span className="text-xs font-semibold opacity-95">
                    {!vicinity.canTimeOut
                      ? `Blocked: Return within ${vicinity.allowedRadiusMeters}m of store`
                      : vicinity.isInsideVicinity
                      ? `In-Store Verified Time Out (${vicinity.distanceMeters}m)`
                      : `Mode C Authorized Off-Site Time Out (${vicinity.distanceMeters}m away)`}
                  </span>
                </button>
              </div>
            )}

            {/* Completed Both Punches Today */}
            {hasTimedInToday && hasTimedOutToday && (
              <div className="rounded-xl border border-sky-500/40 bg-sky-950/30 p-4 text-center">
                <UserCheck className="mx-auto h-8 w-8 text-sky-400" />
                <h4 className="mt-2 text-base font-extrabold text-white">
                  Shift Completed for Today
                </h4>
                <p className="mt-1 text-xs text-slate-300">
                  Timed Out at{" "}
                  {new Date(todayLog!.timeOutAt!).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  • Total Worked:{" "}
                  <strong className="text-sky-300">
                    {todayLog!.totalHours} hrs
                  </strong>
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-xl bg-slate-950 p-3 text-xs text-slate-400 border border-slate-800">
            <strong className="text-slate-200">Zero Paper Time Cards:</strong>{" "}
            Your selfie and GPS distance are automatically attached to your
            digital time card for payroll.
          </div>
        </div>
      </div>

      {/* Employee's Personal Digital Time Cards History */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <h3 className="text-lg font-extrabold text-white">
          My Digital Time Card Logs ({myLogs.length})
        </h3>
        <p className="text-xs text-slate-400">
          Showing your verified Time In and Time Out records with selfie proof.
        </p>

        {myLogs.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
            No attendance punches recorded yet. Tap{" "}
            <strong className="text-emerald-400">TAP TO TIME IN</strong> above
            when inside your branch vicinity.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {myLogs.map((log) => (
              <div
                key={log.id}
                className="grid gap-4 rounded-xl border border-slate-700 bg-slate-950 p-4 sm:grid-cols-12"
              >
                <div className="space-y-1 sm:col-span-5">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-800 px-2.5 py-0.5 font-mono text-xs font-bold text-sky-300">
                      {log.dateKey}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      {log.shiftName}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white">
                    {log.branchName}
                  </p>
                  <div className="pt-1 text-xs text-slate-300 space-y-1">
                    <div>
                      <span className="text-emerald-400 font-semibold">
                        Time In:
                      </span>{" "}
                      {new Date(log.timeInAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      ({log.timeInDistanceM}m)
                      {log.lateMinutes > 0 && (
                        <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-[11px] font-bold text-rose-300">
                          Late {log.lateMinutes}m
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-sky-400 font-semibold">
                        Time Out:
                      </span>{" "}
                      {log.timeOutAt
                        ? `${new Date(log.timeOutAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })} (${log.timeOutDistanceM}m)`
                        : "Currently On Shift"}
                      {log.isOffsiteTimeout && (
                        <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-bold text-amber-300">
                          Mode C Off-Site
                        </span>
                      )}
                    </div>
                    {log.offsiteNote && (
                      <div className="text-[11px] italic text-amber-200">
                        Note: &ldquo;{log.offsiteNote}&rdquo;
                      </div>
                    )}
                    {log.timeOutAt && (
                      <div className="pt-1 font-bold text-white">
                        Total Rendered: {log.totalHours} hrs
                      </div>
                    )}
                  </div>
                </div>

                {/* Watermarked Selfie Thumbnails */}
                <div className="grid grid-cols-2 gap-3 sm:col-span-7">
                  <div>
                    <span className="mb-1 block text-[11px] font-bold uppercase text-emerald-400">
                      Time-In Selfie
                    </span>
                    <img
                      src={log.timeInPhotoData}
                      alt="Time In Selfie"
                      className="h-28 w-full rounded-lg border border-slate-700 object-cover"
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-[11px] font-bold uppercase text-sky-400">
                      Time-Out Selfie
                    </span>
                    {log.timeOutPhotoData ? (
                      <img
                        src={log.timeOutPhotoData}
                        alt="Time Out Selfie"
                        className="h-28 w-full rounded-lg border border-slate-700 object-cover"
                      />
                    ) : (
                      <div className="flex h-28 w-full items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-900 text-xs text-slate-500">
                        Awaiting Time Out
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
