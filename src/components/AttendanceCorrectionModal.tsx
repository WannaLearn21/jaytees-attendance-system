"use client";

import React, { useState } from "react";
import { AttendanceLog, AuditLogEntry, Employee, ShiftTemplate } from "@/types/attendance";

interface AttendanceCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  shifts: ShiftTemplate[];
  existingLog?: AttendanceLog | null;
  onSaveCorrection: (
    updatedLog: AttendanceLog,
    auditEntry: AuditLogEntry
  ) => void;
  currentUserId: string;
  currentUserName: string;
}

export function AttendanceCorrectionModal({
  isOpen,
  onClose,
  employees,
  shifts,
  existingLog,
  onSaveCorrection,
  currentUserId,
  currentUserName,
}: AttendanceCorrectionModalProps) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    existingLog?.employeeId || employees[0]?.id || ""
  );
  const [punchType, setPunchType] = useState<"time_in" | "time_out" | "both">(
    existingLog ? "both" : "time_in"
  );
  const [timeInValue, setTimeInValue] = useState<string>(
    existingLog
      ? new Date(existingLog.timeInAt).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "08:00"
  );
  const [timeOutValue, setTimeOutValue] = useState<string>(
    existingLog?.timeOutAt
      ? new Date(existingLog.timeOutAt).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "17:00"
  );
  const [reason, setReason] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetEmployee =
    employees.find((e) => e.id === selectedEmpId) || employees[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg("A required audit reason must be provided for punch corrections.");
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const inDate = new Date(`${todayStr}T${timeInValue}:00`);
    const outDate = timeOutValue ? new Date(`${todayStr}T${timeOutValue}:00`) : undefined;

    const matchedShift =
      shifts.find((s) => s.id === targetEmployee.shiftId) || shifts[0];

    // Compute late minutes against shift start
    const [startH, startM] = matchedShift.startTime.split(":").map(Number);
    const shiftStartDate = new Date(`${todayStr}T${matchedShift.startTime}:00`);
    const diffMs = inDate.getTime() - shiftStartDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const lateMinutes = diffMins > matchedShift.gracePeriodMins ? diffMins : 0;

    let totalHours = 0;
    if (outDate && outDate > inDate) {
      const workedMs = outDate.getTime() - inDate.getTime();
      totalHours = Math.max(0, Math.round(((workedMs / 3600000) - 1) * 10) / 10); // 1h unpaid break
    }

    const updatedLog: AttendanceLog = existingLog
      ? {
          ...existingLog,
          timeInAt: inDate.toISOString(),
          timeOutAt: outDate?.toISOString(),
          lateMinutes,
          totalHours,
          reviewedByAdmin: true,
        }
      : {
          id: `log-correction-${Date.now()}`,
          employeeId: targetEmployee.id,
          employeeCode: targetEmployee.employeeCode,
          employeeName: targetEmployee.fullName,
          branchId: targetEmployee.branchId,
          branchName: "Branch " + targetEmployee.branchId,
          shiftName: matchedShift.name,
          shiftStart: matchedShift.startTime,
          shiftEnd: matchedShift.endTime,
          dateKey: todayStr,
          timeInAt: inDate.toISOString(),
          timeInLat: 14.5547,
          timeInLng: 121.0244,
          timeInDistanceM: 10,
          timeInPhotoData: targetEmployee.avatarUrl,
          lateMinutes,
          timeOutAt: outDate?.toISOString(),
          timeOutLat: 14.5547,
          timeOutLng: 121.0244,
          timeOutDistanceM: 10,
          isOffsiteTimeout: false,
          undertimeMinutes: 0,
          totalHours,
          statusFlag: "IN_GEOFENCE",
          reviewedByAdmin: true,
        };

    const auditEntry: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      tableName: "punches",
      recordId: updatedLog.id,
      action: "CORRECTION",
      changedBy: currentUserId,
      changedByName: currentUserName,
      branchId: targetEmployee.branchId,
      reason: reason.trim(),
      oldData: existingLog ? { ...existingLog } : undefined,
      newData: { ...updatedLog },
      createdAt: new Date().toISOString(),
    };

    onSaveCorrection(updatedLog, auditEntry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200">
        <div className="px-6 py-5 bg-[#1B1B1A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[22px] text-amber-400">
              edit_note
            </span>
            <h2 className="text-lg font-bold">
              {existingLog ? "Correct Attendance Record" : "Add Missing Punch"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Employee select */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Employee
            </label>
            {existingLog ? (
              <div className="p-3 bg-slate-100 rounded-lg text-sm font-semibold text-slate-800">
                {existingLog.employeeName} ({existingLog.employeeCode})
              </div>
            ) : (
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:border-black"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeCode}) - {emp.designation}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Punch Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Time In (PST)
              </label>
              <input
                type="time"
                value={timeInValue}
                onChange={(e) => setTimeInValue(e.target.value)}
                required
                className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Time Out (PST)
              </label>
              <input
                type="time"
                value={timeOutValue}
                onChange={(e) => setTimeOutValue(e.target.value)}
                className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-black"
              />
            </div>
          </div>

          {/* Required Audit Reason */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Audit Justification Reason <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-mono font-bold">
                Logged to audit_log
              </span>
            </div>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="e.g., Kiosk camera hardware reboot during morning shift. Verified by Store Supervisor."
              required
              className="w-full p-3 border border-slate-300 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-black"
            ></textarea>
            <p className="text-[12px] text-slate-500 mt-1">
              Per PRD v1.1 & Section 5.5, all admin punch edits create an immutable audit record with your user credentials.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-slate-300 text-sm font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-lg bg-[#1B1B1A] text-white text-sm font-bold hover:bg-black shadow-sm"
            >
              Save Correction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
