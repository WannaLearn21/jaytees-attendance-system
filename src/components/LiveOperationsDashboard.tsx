"use client";

import React, { useState } from "react";
import {
  AttendanceLog,
  Branch,
  Employee,
  ShiftTemplate,
} from "@/types/attendance";

interface LiveOperationsDashboardProps {
  branches: Branch[];
  employees: Employee[];
  shifts: ShiftTemplate[];
  logs: AttendanceLog[];
  storageUsedMb: number;
  onLaunchPunchStation: () => void;
  onExportCsv: () => void;
  onPurgeStorage: () => void;
  onOverrideLogFlag: (logId: string) => void;
}

export function LiveOperationsDashboard({
  branches,
  employees,
  logs,
  storageUsedMb,
  onLaunchPunchStation,
  onExportCsv,
  onPurgeStorage,
  onOverrideLogFlag,
}: LiveOperationsDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("ALL");
  const [shiftFilter, setShiftFilter] = useState<string>("ALL");
  const [inspectPhotoLog, setInspectPhotoLog] = useState<AttendanceLog | null>(
    null
  );
  const [isPurging, setIsPurging] = useState(false);
  const [purgeDone, setPurgeDone] = useState(false);
  const [errandQueue, setErrandQueue] = useState([
    {
      id: "err-1",
      name: "Rico Morales (West Mall)",
      time: "08:28 AM",
      task: "Supplier Run • SM City Logistics",
      distance: "1.2 km away",
      approved: false,
    },
    {
      id: "err-2",
      name: "Leah Salonga (Main Store)",
      time: "08:35 AM",
      task: "Barangay Permit Processing",
      distance: "420m away",
      approved: false,
    },
  ]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchQuery.trim() ||
      log.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.branchName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBranch =
      branchFilter === "ALL" || log.branchId === branchFilter;

    const matchesShift =
      shiftFilter === "ALL" ||
      log.shiftName.toLowerCase().includes(shiftFilter.toLowerCase());

    return matchesSearch && matchesBranch && matchesShift;
  });

  const modeCStaffCount = employees.filter((e) => e.allowOffsiteTimeout).length;
  const pendingErrands = errandQueue.filter((e) => !e.approved);

  const handlePurgeClick = () => {
    setIsPurging(true);
    setTimeout(() => {
      setIsPurging(false);
      setPurgeDone(true);
      onPurgeStorage();
      setTimeout(() => setPurgeDone(false), 2500);
    }, 800);
  };

  const handleApproveErrand = (id: string) => {
    setErrandQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, approved: true } : item))
    );
  };

  return (
    <div className="flex flex-col w-full">
      {/* Top 5 Bento Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-md mb-space-lg">
        {/* Stat 1: Total Headcount */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between border border-slate-200/70">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary-container"></div>
          <div>
            <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider">
                Total Headcount
              </span>
              <span className="material-symbols-outlined text-[18px] text-primary-container">
                groups
              </span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display-lg text-headline-xl text-on-surface">
                98
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                / 100 Active
              </span>
            </div>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
            <span>M: {branches[0]?.presentHeadcount ?? 42}</span>
            <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
            <span>DT: {branches[1]?.presentHeadcount ?? 31}</span>
            <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
            <span>WM: {branches[2]?.presentHeadcount ?? 25}</span>
          </div>
        </div>

        {/* Stat 2: On-Duty Now */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between border border-slate-200/70">
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary-container"></div>
          <div>
            <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider">
                On-Duty Now
              </span>
              <span className="material-symbols-outlined text-[18px] text-secondary">
                timer
              </span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display-lg text-headline-xl text-on-surface">
                {80 + logs.length}
              </span>
              <span className="font-label-md text-label-md text-secondary font-semibold">
                Clocked In
              </span>
            </div>
          </div>
          <div className="mt-space-sm flex items-center gap-space-xs bg-surface-container-low px-space-sm py-1 rounded-full w-fit">
            <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse"></span>
            <span className="font-label-sm text-label-sm text-tertiary-container font-medium">
              Floor Staff Live
            </span>
          </div>
        </div>

        {/* Stat 3: Punctual Rate */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between border border-slate-200/70">
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary"></div>
          <div>
            <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider">
                Punctual Rate
              </span>
              <span className="material-symbols-outlined text-[18px] text-secondary">
                verified
              </span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display-lg text-headline-xl text-secondary">
                94.2%
              </span>
              <span className="material-symbols-outlined text-tertiary text-[18px]">
                trending_up
              </span>
            </div>
          </div>
          <div className="mt-space-sm flex items-center gap-space-xs">
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
              <div className="bg-secondary h-full rounded-full w-[94.2%]"></div>
            </div>
            <span className="font-data-mono text-label-sm text-on-surface-variant">
              +1.8%
            </span>
          </div>
        </div>

        {/* Stat 4: Mode C Field Staff */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between border border-slate-200/70">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary-container"></div>
          <div>
            <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider">
                Mode C Field Auth
              </span>
              <span className="material-symbols-outlined text-[18px] text-primary-container">
                local_shipping
              </span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display-lg text-headline-xl text-on-surface">
                {modeCStaffCount}
              </span>
              <span className="font-label-md text-label-md text-primary-container font-semibold">
                Off-Site Staff
              </span>
            </div>
          </div>
          <div className="mt-space-sm flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
            <span className="text-secondary font-medium">Errand / Field OK</span>
            <span className="bg-surface-container px-space-xs py-0.5 rounded text-[10px] font-data-mono">
              LIVE GPS
            </span>
          </div>
        </div>

        {/* Stat 5: Cloud Storage & Purge */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between border border-slate-200/70">
          <div className="absolute top-0 left-0 right-0 h-1 bg-tertiary-container"></div>
          <div>
            <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider">
                Free-Tier Storage
              </span>
              <span className="material-symbols-outlined text-[18px] text-tertiary-container">
                cloud_sync
              </span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display-lg text-headline-xl text-on-surface">
                {storageUsedMb}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant">
                / 1,000 MB
              </span>
            </div>
          </div>
          <div className="mt-space-sm">
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-tertiary-container h-full rounded-full transition-all"
                style={{ width: `${(storageUsedMb / 1000) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="font-label-sm text-[10px] text-on-surface-variant">
                {((storageUsedMb / 1000) * 100).toFixed(1)}% used
              </span>
              <span className="font-label-sm text-[10px] text-tertiary font-medium">
                60-day Auto-Purge
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Grid (70% Live Stream / 30% Health Radar & Sidecar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT 70% SECTION: Live Attendance Feed */}
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          {/* Control & Filter Bar */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md border border-slate-200/70">
            <div className="flex flex-wrap items-center gap-space-sm flex-1">
              <div className="relative min-w-[200px] flex-1">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
                  search
                </span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 bg-surface-container-low rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest shadow-sm placeholder:text-on-surface-variant"
                  placeholder="Search employee, ID, branch..."
                  type="text"
                />
              </div>

              {/* Branch Filter Tabs */}
              <div className="flex items-center bg-surface-container-low p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setBranchFilter("ALL")}
                  className={`px-space-sm py-1.5 rounded font-label-sm text-label-sm transition-all ${
                    branchFilter === "ALL"
                      ? "bg-primary-container text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  All
                </button>
                {branches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBranchFilter(b.id)}
                    className={`px-space-sm py-1.5 rounded font-label-sm text-label-sm transition-all ${
                      branchFilter === b.id
                        ? "bg-primary-container text-on-primary shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {b.shortName}
                  </button>
                ))}
              </div>
            </div>

            {/* Shift Filter Selector */}
            <div className="flex items-center gap-space-xs">
              <div className="bg-surface-container-low px-space-sm py-2 rounded-lg flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[16px]">
                  schedule
                </span>
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="bg-transparent text-on-surface font-label-sm text-label-sm focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Shifts</option>
                  <option value="Opening">Opening (07:00 - 16:00)</option>
                  <option value="Mid">Mid (10:00 - 19:00)</option>
                  <option value="Closing">Closing (13:00 - 22:00)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Live Stream Subheader with Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-space-xs">
            <div className="flex items-center gap-space-sm">
              <div className="w-3 h-3 rounded-full bg-primary-container animate-ping"></div>
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight">
                Real-Time Verification Stream
              </span>
              <span className="bg-secondary-fixed text-on-secondary-fixed font-data-mono text-[11px] px-space-xs py-0.5 rounded-full font-bold">
                {filteredLogs.length} Active Records
              </span>
            </div>
            <div className="flex items-center gap-space-md font-label-sm text-label-sm text-on-surface-variant">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-tertiary-container"></span>
                <span>In-Geofence</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <span>Mode C Approved</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary-container"></span>
                <span>Pending Flag</span>
              </div>
            </div>
          </div>

          {/* Attendance Cards Feed */}
          <div className="flex flex-col gap-space-sm">
            {filteredLogs.map((log) => {
              const isFlagged = log.statusFlag === "OUTSIDE_FLAGGED";
              const isModeC =
                log.isOffsiteTimeout || log.statusFlag === "MODE_C_APPROVED";

              return (
                <div
                  key={log.id}
                  className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-space-md border border-slate-200/70"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      isFlagged
                        ? "bg-primary-container"
                        : isModeC
                        ? "bg-secondary-container"
                        : "bg-tertiary-container"
                    }`}
                  ></div>

                  <div className="flex items-center gap-space-md pl-space-xs">
                    {/* Selfie Verification Thumbnail with Status Halo */}
                    <div
                      className="relative shrink-0 cursor-pointer"
                      onClick={() => setInspectPhotoLog(log)}
                    >
                      <img
                        className="w-14 h-14 rounded-xl object-cover shadow-sm bg-surface-container"
                        alt={log.employeeName}
                        src={log.timeOutPhotoData || log.timeInPhotoData}
                      />
                      <div
                        className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm ${
                          isFlagged
                            ? "bg-primary-container text-on-primary"
                            : isModeC
                            ? "bg-secondary-container text-on-secondary-fixed"
                            : "bg-tertiary-container text-on-tertiary"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {isFlagged
                            ? "warning"
                            : isModeC
                            ? "near_me"
                            : "done"}
                        </span>
                      </div>
                    </div>

                    {/* Employee Meta */}
                    <div>
                      <div className="flex items-center gap-space-xs flex-wrap">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          {log.employeeName}
                        </span>
                        <span className="bg-surface-container-high text-on-surface font-data-mono text-[11px] px-1.5 py-0.5 rounded">
                          {log.employeeCode}
                        </span>
                        <span className="bg-surface-container text-on-surface-variant font-label-sm text-label-sm px-2 py-0.5 rounded">
                          {log.branchName}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-space-sm mt-1 text-on-surface-variant font-body-sm text-body-sm">
                        <span
                          className={`flex items-center gap-1 font-semibold ${
                            isFlagged
                              ? "text-primary-container"
                              : isModeC
                              ? "text-secondary"
                              : "text-tertiary"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {log.timeOutAt ? "logout" : "login"}
                          </span>
                          {log.timeOutAt
                            ? `Time-Out: ${new Date(
                                log.timeOutAt
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}`
                            : `Time-In: ${new Date(
                                log.timeInAt
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}`}
                        </span>
                        <span className="text-on-surface-variant">
                          • Shift: {log.shiftName}
                        </span>
                        {log.lateMinutes > 0 ? (
                          <span className="bg-error-container text-on-error-container font-label-sm text-label-sm px-2 py-0.5 rounded-full font-bold">
                            +{log.lateMinutes}m LATE
                          </span>
                        ) : isModeC && log.offsiteNote ? (
                          <span className="bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm px-2 py-0.5 rounded-full font-medium">
                            {log.offsiteNote}
                          </span>
                        ) : (
                          <span className="bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm px-2 py-0.5 rounded-full font-medium">
                            On-Time
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mode C & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-space-md pt-space-xs md:pt-0">
                    <div className="flex flex-col md:items-end">
                      {isFlagged ? (
                        <>
                          <div className="flex items-center gap-1 bg-error-container text-on-error-container px-space-sm py-1 rounded-full">
                            <span className="material-symbols-outlined text-[16px]">
                              wrong_location
                            </span>
                            <span className="font-label-sm text-label-sm font-bold">
                              Outside Geofence (+{log.timeInDistanceM}m)
                            </span>
                          </div>
                          <span className="font-data-mono text-label-sm text-primary-container mt-0.5">
                            Cell-Tower Fallback • Requires Override
                          </span>
                        </>
                      ) : isModeC ? (
                        <>
                          <div className="flex items-center gap-1 bg-secondary-fixed text-on-secondary-fixed px-space-sm py-1 rounded-full">
                            <span className="material-symbols-outlined text-[16px] text-secondary">
                              explore
                            </span>
                            <span className="font-label-sm text-label-sm font-semibold">
                              Off-Site Approved (Mode C)
                            </span>
                          </div>
                          <span className="font-data-mono text-label-sm text-on-surface-variant mt-0.5">
                            {log.timeOutDistanceM ?? log.timeInDistanceM}m from
                            store
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1 bg-surface-container-low px-space-sm py-1 rounded-full text-tertiary">
                            <span className="material-symbols-outlined text-[16px] text-tertiary-container">
                              verified_user
                            </span>
                            <span className="font-label-sm text-label-sm font-semibold">
                              In-Geofence Verified
                            </span>
                          </div>
                          <span className="font-data-mono text-label-sm text-on-surface-variant mt-0.5">
                            Dist: {log.timeInDistanceM}m •{" "}
                            {log.timeInLat.toFixed(4)}°N,{" "}
                            {log.timeInLng.toFixed(4)}°E
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-space-xs">
                      <button
                        type="button"
                        onClick={() => setInspectPhotoLog(log)}
                        className="w-10 h-10 rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface flex items-center justify-center transition-colors"
                        title="Inspect Selfie High-Res"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          zoom_in
                        </span>
                      </button>

                      {isFlagged && (
                        <button
                          type="button"
                          onClick={() => onOverrideLogFlag(log.id)}
                          className="px-space-sm h-10 rounded-lg bg-primary-container text-on-primary font-label-sm text-label-sm hover:bg-primary transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            gavel
                          </span>
                          <span>SysAd Override</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Pagination / Real-time Sync Bar */}
          <div className="flex items-center justify-between bg-surface-container-lowest p-space-md rounded-xl shadow-sm text-on-surface-variant font-label-sm text-label-sm border border-slate-200/70">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[18px] text-tertiary animate-spin">
                autorenew
              </span>
              <span>
                WebSocket connected • Listening to PostgreSQL replication
                channel
              </span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="font-data-mono px-space-xs">
                Showing {filteredLogs.length} Verified Records
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT 30% SECTION: Health Radar, Mode C Exceptions & Fast Actions */}
        <div className="lg:col-span-4 flex flex-col gap-space-md">
          {/* Branch Health Radar */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-slate-200/70">
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary-container text-[20px]">
                  radar
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Branch Health Radar
                </span>
              </div>
              <span className="bg-tertiary-fixed text-on-tertiary-fixed font-data-mono text-[11px] px-2 py-0.5 rounded-full font-bold">
                ALL ONLINE
              </span>
            </div>

            <div className="flex flex-col gap-space-sm">
              {branches.map((branch, idx) => {
                const pct = Math.min(
                  100,
                  Math.round(
                    (branch.presentHeadcount / branch.assignedHeadcount) * 100
                  )
                );
                return (
                  <div
                    key={branch.id}
                    className="bg-surface-container-low p-space-sm rounded-lg flex flex-col gap-space-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-label-lg text-label-lg text-on-surface font-bold">
                        {idx + 1}. {branch.name}
                      </span>
                      <span
                        className={`font-data-mono text-[11px] px-2 py-0.5 rounded font-bold ${
                          idx === 1
                            ? "bg-error-container text-on-error-container"
                            : "bg-tertiary-container text-on-tertiary"
                        }`}
                      >
                        {idx === 1 ? "1 Out-of-Fence" : "0 Anomalies"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
                      <span>
                        Geofence Radius:{" "}
                        <strong className="text-on-surface">
                          {branch.radiusMeters}m
                        </strong>
                      </span>
                      <span className="font-semibold text-tertiary">
                        {branch.presentHeadcount} / {branch.assignedHeadcount}{" "}
                        Present ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                      <div
                        className={`${
                          idx === 1
                            ? "bg-secondary-container"
                            : "bg-tertiary-container"
                        } h-full rounded-full`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mode C Live Exceptions Widget */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-slate-200/70">
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  near_me
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Mode C Live Queue
                </span>
              </div>
              <span className="bg-secondary-container text-on-secondary-fixed font-data-mono text-[11px] px-2 py-0.5 rounded-full font-bold">
                {pendingErrands.length} Pending
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">
              Errand punches awaiting SysAd geofence verification &amp; dispatch
              sign-off.
            </p>

            <div className="space-y-2">
              {errandQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-space-sm bg-surface-container-low rounded-lg flex flex-col gap-space-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.approved ? "bg-tertiary" : "bg-secondary"
                        }`}
                      ></span>
                      <span className="font-label-md text-label-md text-on-surface font-bold">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-data-mono text-[11px] text-on-surface-variant">
                      {item.time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
                    <span>{item.task}</span>
                    <span className="text-secondary font-bold font-data-mono">
                      {item.distance}
                    </span>
                  </div>
                  <div className="flex items-center gap-space-xs mt-1">
                    {item.approved ? (
                      <div className="flex-1 py-1.5 bg-tertiary-fixed text-on-tertiary-fixed rounded font-label-sm text-label-sm text-center font-bold">
                        ✓ Errand Approved
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApproveErrand(item.id)}
                        className="flex-1 py-1.5 bg-primary-container text-on-primary rounded font-label-sm text-label-sm hover:bg-primary transition-colors text-center font-semibold"
                      >
                        Approve Errand
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Operational Actions Card */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-slate-200/70">
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold block mb-space-sm">
              Fast Actions
            </span>
            <div className="flex flex-col gap-space-xs">
              <button
                type="button"
                onClick={onExportCsv}
                className="w-full h-12 bg-primary-container text-on-primary rounded-xl font-label-lg text-label-lg flex items-center justify-center gap-space-sm hover:bg-primary transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">
                  file_download
                </span>
                <span>Export Cutoff Summary (CSV)</span>
              </button>

              <button
                type="button"
                onClick={onLaunchPunchStation}
                className="w-full h-12 bg-surface-container-high text-on-surface rounded-xl font-label-lg text-label-lg flex items-center justify-center gap-space-sm hover:bg-surface-dim transition-all"
              >
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  desktop_windows
                </span>
                <span>Launch Punch Station Simulator</span>
              </button>

              <button
                type="button"
                onClick={handlePurgeClick}
                className="w-full h-11 bg-surface-container-low text-on-surface-variant rounded-xl font-label-md text-label-md flex items-center justify-center gap-space-sm hover:bg-error-container hover:text-on-error-container transition-all"
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${
                    isPurging ? "animate-spin" : ""
                  }`}
                >
                  {isPurging
                    ? "refresh"
                    : purgeDone
                    ? "check_circle"
                    : "cleaning_services"}
                </span>
                <span>
                  {isPurging
                    ? "Purging 24MB storage..."
                    : purgeDone
                    ? "Purged Successfully! (160MB used)"
                    : "Purge Cached Thumbnails (60+ Days)"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* High-Res Selfie Inspection Modal */}
      {inspectPhotoLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/60 backdrop-blur-sm p-4"
          onClick={() => setInspectPhotoLog(null)}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-space-lg shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                  {inspectPhotoLog.employeeName} ({inspectPhotoLog.employeeCode})
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {inspectPhotoLog.branchName} • {inspectPhotoLog.shiftName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectPhotoLog(null)}
                className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="font-label-sm text-label-sm uppercase text-tertiary block mb-1">
                  Time-In Verification Selfie
                </span>
                <img
                  src={inspectPhotoLog.timeInPhotoData}
                  alt="Time In Selfie"
                  className="w-full h-56 object-cover rounded-xl shadow"
                />
              </div>
              <div>
                <span className="font-label-sm text-label-sm uppercase text-secondary block mb-1">
                  Time-Out Verification Selfie
                </span>
                {inspectPhotoLog.timeOutPhotoData ? (
                  <img
                    src={inspectPhotoLog.timeOutPhotoData}
                    alt="Time Out Selfie"
                    className="w-full h-56 object-cover rounded-xl shadow"
                  />
                ) : (
                  <div className="w-full h-56 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant font-body-sm text-body-sm">
                    Currently Active on Shift
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
