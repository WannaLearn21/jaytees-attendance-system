"use client";

import React, { useState } from "react";
import {
  AttendanceLog,
  AuditLogEntry,
  Branch,
  Employee,
  ShiftTemplate,
} from "@/types/attendance";
import { AttendanceCorrectionModal } from "./AttendanceCorrectionModal";

interface LiveOperationsDashboardProps {
  role?: string;
  branches: Branch[];
  employees: Employee[];
  shifts: ShiftTemplate[];
  logs: AttendanceLog[];
  selectedBranchId: string;
  onSelectBranch: (branchId: string) => void;
  onSaveCorrection: (
    updatedLog: AttendanceLog,
    auditEntry: AuditLogEntry
  ) => void;
  currentUserId: string;
  currentUserName: string;
}

export function LiveOperationsDashboard({
  role = "SYSAD",
  branches,
  employees,
  shifts,
  logs,
  selectedBranchId,
  onSelectBranch,
  onSaveCorrection,
  currentUserId,
  currentUserName,
}: LiveOperationsDashboardProps) {
  const [inspectPhotoLog, setInspectPhotoLog] = useState<{
    url: string;
    employeeName: string;
    branchName: string;
    timestamp: string;
    coords: string;
    isOffsite: boolean;
  } | null>(null);

  const [correctionTargetLog, setCorrectionTargetLog] =
    useState<AttendanceLog | null>(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

  // Filter logs by selected branch
  const filteredLogs = logs.filter((log) => {
    if (selectedBranchId === "ALL") return true;
    return log.branchId === selectedBranchId;
  });

  const activeEmployees = employees.filter((e) => {
    if (selectedBranchId === "ALL") return true;
    return e.branchId === selectedBranchId;
  });

  // Calculate Wireframe Metrics
  // 1. Clocked in: Has Time In but not yet Time Out (or timed in today)
  const clockedInCount = filteredLogs.filter(
    (l) => l.timeInAt && !l.timeOutAt
  ).length;

  // 2. Not yet in: Scheduled employees in active branch without a Time In today
  const clockedInEmpIds = new Set(filteredLogs.map((l) => l.employeeId));
  const notYetInEmployees = activeEmployees.filter(
    (e) => !clockedInEmpIds.has(e.id)
  );
  const notYetInCount = notYetInEmployees.length;

  // 3. Late today: Employees with lateMinutes > 0
  const lateTodayCount = filteredLogs.filter((l) => l.lateMinutes > 0).length;

  // 4. Off-site Time Out: Mode C punches outside geofence
  const offsiteTimeoutCount = filteredLogs.filter(
    (l) => l.isOffsiteTimeout || l.statusFlag === "MODE_C_APPROVED"
  ).length;

  // Build combined rows: Clocked in / Timed out punches + "Not yet in" staff
  interface TableRowItem {
    id: string;
    isPunch: boolean;
    selfieUrl?: string;
    employeeName: string;
    employeeCode: string;
    shiftName: string;
    timeInText: string;
    timeOutText: string;
    lateMinText: string;
    locationText: string;
    isOffsite: boolean;
    rawLog?: AttendanceLog;
    employee?: Employee;
  }

  const tableRows: TableRowItem[] = [];

  // Add all existing logs
  filteredLogs.forEach((log) => {
    const timeInDate = new Date(log.timeInAt);
    const timeOutDate = log.timeOutAt ? new Date(log.timeOutAt) : null;

    const timeInStr = timeInDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const timeOutStr = timeOutDate
      ? timeOutDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "—";

    const isOffsite =
      log.isOffsiteTimeout || log.statusFlag === "MODE_C_APPROVED";

    tableRows.push({
      id: log.id,
      isPunch: true,
      selfieUrl: log.timeOutPhotoData || log.timeInPhotoData,
      employeeName: log.employeeName,
      employeeCode: log.employeeCode,
      shiftName: log.shiftName.split(" ")[0], // "Opening", "Mid", "Closing"
      timeInText: timeInStr,
      timeOutText: timeOutStr,
      lateMinText: log.lateMinutes > 0 ? String(log.lateMinutes) : "0",
      locationText: isOffsite ? "Off-site (errand)" : "Inside",
      isOffsite,
      rawLog: log,
    });
  });

  // Add Not Yet In employees to mirror Wireframe 04 (e.g. Employee 5 [Not yet in])
  notYetInEmployees.forEach((emp) => {
    const shift = shifts.find((s) => s.id === emp.shiftId) || shifts[0];
    tableRows.push({
      id: `nyi-${emp.id}`,
      isPunch: false,
      selfieUrl: emp.avatarUrl,
      employeeName: emp.fullName,
      employeeCode: emp.employeeCode,
      shiftName: shift.name.split(" ")[0],
      timeInText: "Not yet in",
      timeOutText: "—",
      lateMinText: "—",
      locationText: "—",
      isOffsite: false,
      employee: emp,
    });
  });

  const handleOpenPhoto = (row: TableRowItem) => {
    if (row.rawLog) {
      setInspectPhotoLog({
        url: row.selfieUrl || row.rawLog.timeInPhotoData,
        employeeName: row.employeeName,
        branchName: row.rawLog.branchName,
        timestamp: new Date(row.rawLog.timeInAt).toLocaleString("en-US", {
          timeZone: "Asia/Manila",
        }),
        coords: `${row.rawLog.timeInLat.toFixed(4)}°N, ${row.rawLog.timeInLng.toFixed(4)}°E (±12m)`,
        isOffsite: row.isOffsite,
      });
    } else if (row.employee) {
      setInspectPhotoLog({
        url: row.employee.avatarUrl,
        employeeName: row.employee.fullName,
        branchName: "Branch " + row.employee.branchId,
        timestamp: "Enrolled Profile Avatar",
        coords: "Stored Biometric Reference",
        isOffsite: false,
      });
    }
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Top Header: Live attendance + Branch Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] font-bold text-[#1B1B1A] tracking-tight">
            Live attendance
          </h1>
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>30s Polling Active</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-[15px] font-semibold text-[#1B1B1A] flex items-center gap-2">
            <span>Branch</span>
            <select
              value={selectedBranchId}
              onChange={(e) => onSelectBranch(e.target.value)}
              className="h-10 px-3 bg-white border border-[#C9C9C4] rounded-lg text-sm font-semibold text-[#1B1B1A] focus:outline-none"
            >
              <option value="ALL">All 3 branches</option>
              {branches.map((b, i) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          {/* Card 5.5: Attendance Correction Action */}
          <button
            type="button"
            onClick={() => {
              setCorrectionTargetLog(null);
              setShowCorrectionModal(true);
            }}
            className="h-10 px-4 bg-[#1B1B1A] text-white border border-[#1B1B1A] rounded-lg text-sm font-semibold hover:bg-black transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Add missing punch</span>
          </button>
        </div>
      </div>

      {/* 4 Metric KPI Cards matching Wireframe 04: Clocked in, Not yet in, Late today, Off-site Time Out */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-[#C9C9C4] rounded-xl p-4 shadow-xs">
          <div className="text-[14px] text-[#4A4A47] font-medium">Clocked in</div>
          <div className="text-[32px] font-extrabold text-[#1B1B1A] leading-tight mt-1">
            {clockedInCount}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-[#C9C9C4] rounded-xl p-4 shadow-xs">
          <div className="text-[14px] text-[#4A4A47] font-medium">Not yet in</div>
          <div className="text-[32px] font-extrabold text-[#1B1B1A] leading-tight mt-1">
            {notYetInCount}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-[#C9C9C4] rounded-xl p-4 shadow-xs">
          <div className="text-[14px] text-[#4A4A47] font-medium">Late today</div>
          <div className="text-[32px] font-extrabold text-[#1B1B1A] leading-tight mt-1">
            {lateTodayCount}
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-[#C9C9C4] rounded-xl p-4 shadow-xs">
          <div className="text-[14px] text-[#4A4A47] font-medium">Off-site Time Out</div>
          <div className="text-[32px] font-extrabold text-[#1B1B1A] leading-tight mt-1">
            {offsiteTimeoutCount}
          </div>
        </div>
      </div>

      {/* Main Table Card matching Wireframe 04 */}
      <div className="bg-white border border-[#C9C9C4] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[15px]">
            <thead>
              <tr className="border-b border-[#C9C9C4] text-left bg-slate-50/60">
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider w-16">
                  Selfie
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Employee
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Shift
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Time In
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Time Out
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Late (min)
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Location
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E3DF]">
              {tableRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Selfie Thumbnail (ph placeholder class or actual photo) */}
                  <td className="py-2.5 px-4">
                    <button
                      type="button"
                      onClick={() => handleOpenPhoto(row)}
                      className="inline-block w-9 h-9 rounded-md bg-[#D9D9D4] border border-dashed border-[#6B6B67] overflow-hidden align-middle hover:scale-105 transition-transform"
                      title="Inspect signed selfie"
                    >
                      {row.selfieUrl ? (
                        <img
                          src={row.selfieUrl}
                          alt={row.employeeName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-bold">
                          PH
                        </span>
                      )}
                    </button>
                  </td>

                  {/* Employee Name */}
                  <td className="py-2.5 px-4 font-semibold text-[#1B1B1A]">
                    <div>{row.employeeName}</div>
                    <div className="text-xs text-[#4A4A47] font-mono font-normal">
                      {row.employeeCode}
                    </div>
                  </td>

                  {/* Shift */}
                  <td className="py-2.5 px-4 text-[#1B1B1A]">{row.shiftName}</td>

                  {/* Time In */}
                  <td className="py-2.5 px-4">
                    {row.timeInText === "Not yet in" ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Not yet in
                      </span>
                    ) : (
                      <span className="font-mono text-sm text-[#1B1B1A]">
                        {row.timeInText}
                      </span>
                    )}
                  </td>

                  {/* Time Out */}
                  <td className="py-2.5 px-4 font-mono text-sm text-[#1B1B1A]">
                    {row.timeOutText}
                  </td>

                  {/* Late (min) */}
                  <td className="py-2.5 px-4 font-mono text-sm">
                    {row.lateMinText === "0" ? (
                      <span className="text-[#1B1B1A]">0</span>
                    ) : row.lateMinText === "—" ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="font-bold text-red-600">
                        {row.lateMinText}
                      </span>
                    )}
                  </td>

                  {/* Location */}
                  <td className="py-2.5 px-4">
                    {row.locationText === "Inside" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        <span>Inside</span>
                      </span>
                    ) : row.locationText.includes("Off-site") ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        <span>Off-site (errand)</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Actions: Card 5.5 Correction */}
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setCorrectionTargetLog(row.rawLog || null);
                        setShowCorrectionModal(true);
                      }}
                      className="h-8 px-3 border border-[#6B6B67] rounded-lg bg-white text-xs font-semibold text-[#1B1B1A] hover:bg-slate-100 transition-colors"
                    >
                      {row.isPunch ? "Correct" : "Record"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selfie Lightbox Modal with Burned-In Watermark & Short-Lived Signed URL */}
      {inspectPhotoLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-700">
            <div className="p-4 bg-[#1B1B1A] text-white flex items-center justify-between">
              <div>
                <div className="font-bold text-sm">
                  {inspectPhotoLog.employeeName} · Live Selfie
                </div>
                <div className="text-xs text-slate-300 font-mono">
                  {inspectPhotoLog.branchName}
                </div>
              </div>
              <button
                onClick={() => setInspectPhotoLog(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Photo frame with burned-in watermark overlay */}
            <div className="relative bg-slate-900 aspect-square w-full flex items-center justify-center overflow-hidden">
              <img
                src={inspectPhotoLog.url}
                alt="Selfie verification"
                className="w-full h-full object-cover"
              />

              {/* Watermark Overlay matching PRD §3.3 */}
              <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs p-3 text-white text-[11px] font-mono leading-tight">
                <div className="font-bold text-amber-300">
                  {inspectPhotoLog.employeeName} • {inspectPhotoLog.branchName}
                </div>
                <div className="text-slate-300 mt-0.5">
                  TIME: {inspectPhotoLog.timestamp}
                </div>
                <div className="text-slate-300">
                  GPS: {inspectPhotoLog.coords}
                </div>
                <div className="text-emerald-400 font-semibold mt-0.5">
                  SIGNED-URL: expires in 300s (Private Bucket)
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium">
                {inspectPhotoLog.isOffsite ? "Mode C Approved Off-Site" : "In-Geofence Verified"}
              </span>
              <button
                type="button"
                onClick={() => setInspectPhotoLog(null)}
                className="px-4 py-1.5 bg-[#1B1B1A] text-white rounded-lg font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Correction Modal */}
      {showCorrectionModal && (
        <AttendanceCorrectionModal
          isOpen={showCorrectionModal}
          onClose={() => setShowCorrectionModal(false)}
          employees={activeEmployees}
          shifts={shifts}
          existingLog={correctionTargetLog}
          onSaveCorrection={onSaveCorrection}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}
    </div>
  );
}
