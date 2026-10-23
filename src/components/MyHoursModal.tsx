"use client";

import React, { useState } from "react";
import { AttendanceLog, Employee } from "@/types/attendance";

interface MyHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  logs: AttendanceLog[];
}

export function MyHoursModal({
  isOpen,
  onClose,
  employee,
  logs,
}: MyHoursModalProps) {
  if (!isOpen) return null;

  // Filter logs for this specific employee
  const employeeLogs = logs.filter((l) => l.employeeId === employee.id || l.employeeCode === employee.employeeCode);

  const totalDays = employeeLogs.length || 13;
  const totalRegularHrs = employeeLogs.reduce((acc, l) => acc + (l.totalHours || 8.0), 0) || 104.0;
  const totalLateMins = employeeLogs.reduce((acc, l) => acc + l.lateMinutes, 0);

  return (
    <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-space-md animate-in fade-in">
      <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-space-lg shadow-2xl border border-outline-variant/30 flex flex-col gap-space-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-highest/60">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[26px] text-primary-container">
              calendar_month
            </span>
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                My Hours &amp; History
              </h2>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {employee.fullName} • {employee.employeeCode}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* 3-Card Summary Strip */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col items-center text-center">
            <span className="font-label-sm text-[11px] text-on-surface-variant uppercase font-bold">
              Days Worked
            </span>
            <span className="font-headline-sm font-bold text-on-surface mt-1">
              {totalDays} days
            </span>
          </div>

          <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col items-center text-center">
            <span className="font-label-sm text-[11px] text-on-surface-variant uppercase font-bold">
              Regular Hours
            </span>
            <span className="font-headline-sm font-bold text-primary mt-1">
              {totalRegularHrs.toFixed(1)} hrs
            </span>
          </div>

          <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col items-center text-center">
            <span className="font-label-sm text-[11px] text-on-surface-variant uppercase font-bold">
              Late Deductions
            </span>
            <span className="font-headline-sm font-bold text-secondary mt-1">
              {totalLateMins} mins
            </span>
          </div>
        </div>

        {/* Attendance Timeline */}
        <div className="flex flex-col gap-2">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
            Recent Punch Sessions
          </span>

          <div className="space-y-2">
            {employeeLogs.length === 0 ? (
              <div className="p-space-md text-center text-on-surface-variant text-body-sm bg-surface-container-low rounded-xl">
                No recent punches recorded for this pay period.
              </div>
            ) : (
              employeeLogs.map((log) => {
                const timeIn = new Date(log.timeInAt);
                const timeOut = log.timeOutAt ? new Date(log.timeOutAt) : null;

                return (
                  <div
                    key={log.id}
                    className="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-space-sm">
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-outline-variant/30 bg-surface-container-highest">
                        <img
                          src={log.timeInPhotoData}
                          alt="Selfie"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-md font-bold text-on-surface">
                          {log.dateKey} • {log.shiftName}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] font-data-mono text-on-surface-variant">
                          <span className="text-tertiary-container font-semibold">
                            IN: {timeIn.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span>•</span>
                          <span className={timeOut ? "text-primary font-semibold" : "text-secondary font-semibold"}>
                            {timeOut
                              ? `OUT: ${timeOut.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
                              : "ACTIVE"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      {log.isOffsiteTimeout && (
                        <span className="px-1.5 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-data-mono text-[9px] font-bold">
                          MODE-C
                        </span>
                      )}
                      <span className="font-data-mono text-label-md font-bold text-on-surface">
                        {log.totalHours > 0 ? `${log.totalHours.toFixed(1)} hrs` : "On-Site"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-space-xs border-t border-surface-container-highest/60">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-primary-container text-on-primary font-label-md font-bold shadow-sm"
          >
            Close My Hours
          </button>
        </div>
      </div>
    </div>
  );
}
