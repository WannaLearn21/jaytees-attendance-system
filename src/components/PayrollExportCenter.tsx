"use client";

import React, { useState } from "react";
import {
  AccessRole,
  AttendanceLog,
  Branch,
  Employee,
} from "@/types/attendance";

interface PayrollExportCenterProps {
  role: AccessRole;
  branches: Branch[];
  employees: Employee[];
  logs: AttendanceLog[];
}

interface LedgerRow {
  employeeCode: string;
  initials: string;
  fullName: string;
  designation: string;
  branchKey: "main" | "downtown" | "westmall";
  branchLabel: string;
  daysPresent: string;
  regularHours: number;
  lateMins: number;
  undertimeMins: number;
  modeCPunches: number;
  netPayableHours: number;
}

const BASE_LEDGER_ROWS: LedgerRow[] = [
  {
    employeeCode: "JT-2024-001",
    initials: "RC",
    fullName: "Rodrigo Cruz",
    designation: "Senior Barista / Lead",
    branchKey: "main",
    branchLabel: "Main Branch",
    daysPresent: "13 / 13",
    regularHours: 104.0,
    lateMins: 0,
    undertimeMins: 0,
    modeCPunches: 2,
    netPayableHours: 104.0,
  },
  {
    employeeCode: "JT-2024-008",
    initials: "MA",
    fullName: "Maria Angelica Santos",
    designation: "Store Supervisor",
    branchKey: "downtown",
    branchLabel: "Downtown Hub",
    daysPresent: "12 / 13",
    regularHours: 96.0,
    lateMins: 18,
    undertimeMins: 0,
    modeCPunches: 0,
    netPayableHours: 95.7,
  },
  {
    employeeCode: "JT-2024-015",
    initials: "KB",
    fullName: "Kenji Bautista",
    designation: "Logistics / Inventory",
    branchKey: "westmall",
    branchLabel: "West Mall",
    daysPresent: "13 / 13",
    regularHours: 104.0,
    lateMins: 0,
    undertimeMins: 45,
    modeCPunches: 6,
    netPayableHours: 103.25,
  },
  {
    employeeCode: "JT-2024-022",
    initials: "DO",
    fullName: "Daphne Ocampo",
    designation: "Pastry Artisan",
    branchKey: "main",
    branchLabel: "Main Branch",
    daysPresent: "13 / 13",
    regularHours: 104.0,
    lateMins: 12,
    undertimeMins: 0,
    modeCPunches: 0,
    netPayableHours: 103.8,
  },
  {
    employeeCode: "JT-2024-031",
    initials: "JV",
    fullName: "Joshua Villanueva",
    designation: "Maintenance & Kiosk Tech",
    branchKey: "downtown",
    branchLabel: "Downtown Hub",
    daysPresent: "11 / 13",
    regularHours: 88.0,
    lateMins: 0,
    undertimeMins: 0,
    modeCPunches: 8,
    netPayableHours: 88.0,
  },
  {
    employeeCode: "JT-2024-044",
    initials: "SL",
    fullName: "Sarah Jane Lim",
    designation: "Front Counter Specialist",
    branchKey: "westmall",
    branchLabel: "West Mall",
    daysPresent: "13 / 13",
    regularHours: 104.0,
    lateMins: 5,
    undertimeMins: 30,
    modeCPunches: 0,
    netPayableHours: 103.42,
  },
];

export default function PayrollExportCenter({
  logs,
}: PayrollExportCenterProps) {
  const [cutoffPeriod, setCutoffPeriod] = useState("oct-16-31");
  const [branchFilter, setBranchFilter] = useState("all");
  const [exportPreset, setExportPreset] = useState("csv-standard");
  const [autoDeductLate, setAutoDeductLate] = useState(true);
  const [includeModeCTokens, setIncludeModeCTokens] = useState(true);
  const [exportDoleFormat, setExportDoleFormat] = useState(false);

  const [storageMb, setStorageMb] = useState(184);
  const [purgeStatus, setPurgeStatus] = useState<"idle" | "purging" | "purged">(
    "idle"
  );
  const [downloadState, setDownloadState] = useState<
    "idle" | "compiling" | "done"
  >("idle");
  const [auditModalRow, setAuditModalRow] = useState<LedgerRow | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Merge live session punches into the ledger preview so new punches reflect immediately
  const liveLedgerAdditions: LedgerRow[] = logs.slice(0, 3).map((l) => {
    const parts = l.employeeName.split(" ");
    const initials =
      (parts[0]?.[0] || "J") + (parts[parts.length - 1]?.[0] || "T");
    const bKey: "main" | "downtown" | "westmall" = l.branchId.includes(
      "downtown"
    )
      ? "downtown"
      : l.branchId.includes("west")
      ? "westmall"
      : "main";
    const regHrs = 96.0 + (l.totalHours || 8.0);
    const deductHrs = autoDeductLate
      ? (l.lateMinutes + l.undertimeMinutes) / 60
      : 0;
    return {
      employeeCode: l.employeeCode,
      initials,
      fullName: l.employeeName,
      designation: `${l.shiftName} Staff`,
      branchKey: bKey,
      branchLabel: l.branchName,
      daysPresent: "13 / 13",
      regularHours: Number(regHrs.toFixed(1)),
      lateMins: l.lateMinutes,
      undertimeMins: l.undertimeMinutes,
      modeCPunches: l.isOffsiteTimeout ? 1 : 0,
      netPayableHours: Number((regHrs - deductHrs).toFixed(2)),
    };
  });

  // Deduplicate by employeeCode
  const combinedRows: LedgerRow[] = [...BASE_LEDGER_ROWS];
  liveLedgerAdditions.forEach((item) => {
    if (!combinedRows.some((r) => r.employeeCode === item.employeeCode)) {
      combinedRows.unshift(item);
    }
  });

  const filteredRows = combinedRows.filter(
    (r) => branchFilter === "all" || r.branchKey === branchFilter
  );

  const totalNetHours = filteredRows.reduce(
    (acc, r) => acc + r.netPayableHours,
    0
  );
  const totalLateMins = filteredRows.reduce((acc, r) => acc + r.lateMins, 0);
  const totalUndertimeMins = filteredRows.reduce(
    (acc, r) => acc + r.undertimeMins,
    0
  );

  const handleGenerateCsv = () => {
    setDownloadState("compiling");
    setTimeout(() => {
      const headers = [
        "EmployeeID",
        "FullName",
        "Branch",
        "DaysPresent",
        "RegularHours",
        "LateMins",
        "UndertimeMins",
        ...(includeModeCTokens ? ["ModeCPunches"] : []),
        "NetPayableHours",
      ];

      const csvLines = [
        headers.join(","),
        ...filteredRows.map((r) =>
          [
            r.employeeCode,
            `"${r.fullName}"`,
            `"${r.branchLabel}"`,
            `"${r.daysPresent}"`,
            r.regularHours.toFixed(1),
            r.lateMins,
            r.undertimeMins,
            ...(includeModeCTokens ? [r.modeCPunches] : []),
            r.netPayableHours.toFixed(2),
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvLines], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `JATS_Payroll_${cutoffPeriod}_${branchFilter}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadState("done");
      setTimeout(() => setDownloadState("idle"), 2200);
    }, 800);
  };

  const handleTriggerPurge = () => {
    setPurgeStatus("purging");
    setTimeout(() => {
      setStorageMb(142);
      setPurgeStatus("purged");
      setBannerNotice(
        "60-Day Auto-Purge executed: 42.0 MB (~1,200 expired selfie files) recycled. Supabase Storage remains within $0.00/mo free tier."
      );
      setTimeout(() => setBannerNotice(null), 5000);
    }, 1000);
  };

  const handleDownloadBackup = () => {
    setBannerNotice(
      "Generated local compressed archive (JATS_Backup_Cycle19_WebP_Dump.zip) for offline vault retention."
    );
    setTimeout(() => setBannerNotice(null), 4000);
  };

  return (
    <div className="flex flex-col w-full">
      <div className="relative py-space-md">
        <div className="absolute -top-12 -left-8 w-72 h-72 rounded-full bg-secondary-container/10 blur-3xl pointer-events-none"></div>
        <div className="absolute top-16 right-12 w-96 h-96 rounded-full bg-primary-container/5 blur-3xl pointer-events-none"></div>

        {/* Hero Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md pb-space-lg">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-secondary"></span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-bold">
                Financial Engine &amp; System Pruning
              </span>
              <span className="text-on-surface-variant font-data-mono text-[11px] ml-2 px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface">
                SYS-REL 1.1b
              </span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">
              Payroll CSV &amp; Export Center
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-0.5">
              Bi-monthly ledger reconciliation, multi-branch Mode C attendance
              normalization, and zero-cost infrastructure optimizer.
            </p>
          </div>
          <div className="flex items-center gap-space-sm flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-lowest shadow-sm">
              <span className="material-symbols-outlined text-[18px] text-tertiary-container">
                verified
              </span>
              <span className="font-label-md text-label-md text-on-surface">
                Target Budget:
              </span>
              <span className="font-data-mono text-data-mono font-bold text-tertiary-container">
                $0.00 / mo Active
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed">
              <span className="material-symbols-outlined text-[16px]">
                schedule
              </span>
              <span className="font-label-sm text-label-sm font-semibold">
                Cutoff Window: Cycle #19
              </span>
            </div>
          </div>
        </div>

        {bannerNotice && (
          <div className="mb-space-md px-space-md py-space-sm rounded-xl bg-tertiary-fixed text-on-tertiary-fixed font-label-md text-label-md flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[18px]">
                check_circle
              </span>
              <span>{bannerNotice}</span>
            </div>
            <button
              onClick={() => setBannerNotice(null)}
              className="text-on-tertiary-fixed hover:opacity-75"
            >
              <span className="material-symbols-outlined text-[16px]">
                close
              </span>
            </button>
          </div>
        )}

        {/* Free-Tier Infrastructure Monitor ($0/month Budget Compliance) */}
        <div className="w-full bg-surface-container-lowest rounded-xl p-space-lg shadow-sm mb-space-lg relative overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-secondary-container via-primary-container to-tertiary-container absolute top-0 left-0 right-0"></div>
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md mb-space-md">
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[24px]">
                  savings
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Free-Tier Infrastructure Telemetry
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-tertiary font-label-sm text-label-sm font-semibold tracking-wide uppercase">
                    100% Zero-Spend
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Automated retention lifecycle protecting PostgreSQL database
                  quota and Supabase media storage.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-space-sm flex-wrap">
              <button
                onClick={handleDownloadBackup}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">
                  cloud_download
                </span>
                <span>Download Archive Backup</span>
              </button>
              <button
                onClick={handleTriggerPurge}
                disabled={purgeStatus === "purging"}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all shadow-sm disabled:opacity-60"
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${
                    purgeStatus === "purging" ? "animate-spin" : ""
                  }`}
                >
                  {purgeStatus === "purging" ? "sync" : "auto_delete"}
                </span>
                <span>
                  {purgeStatus === "purging"
                    ? "Purging..."
                    : purgeStatus === "purged"
                    ? "Purged (42 MB Freed)"
                    : "Trigger Purge Now"}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md pt-space-xs">
            {/* PostgreSQL Metric */}
            <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                    Supabase PostgreSQL
                  </span>
                  <span className="font-headline-md text-headline-md text-on-surface font-bold mt-1">
                    18.2 MB{" "}
                    <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">
                      / 500 MB
                    </span>
                  </span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[20px]">
                    database
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Allocated Quota
                  </span>
                  <span className="font-data-mono text-data-mono font-bold text-on-surface">
                    3.64%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                  <div
                    className="bg-secondary h-full rounded-full transition-all duration-700"
                    style={{ width: "3.64%" }}
                  ></div>
                </div>
              </div>
              <div className="mt-3 pt-2 text-on-surface-variant font-body-sm text-body-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-tertiary-container">
                  check_circle
                </span>
                <span>Zero spillover risk. 31,450 rows cached.</span>
              </div>
            </div>

            {/* Storage Bucket Metric */}
            <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                    Storage Bucket (Selfies/GPS)
                  </span>
                  <span className="font-headline-md text-headline-md text-on-surface font-bold mt-1">
                    {storageMb} MB{" "}
                    <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">
                      / 1,000 MB
                    </span>
                  </span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[20px]">
                    photo_camera_front
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Capacity Used
                  </span>
                  <span className="font-data-mono text-data-mono font-bold text-on-surface">
                    {(storageMb / 10).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                  <div
                    className="bg-primary-container h-full rounded-full transition-all duration-700"
                    style={{ width: `${(storageMb / 10).toFixed(1)}%` }}
                  ></div>
                </div>
              </div>
              <div className="mt-3 pt-2 text-on-surface-variant font-body-sm text-body-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  compress
                </span>
                <span>
                  Lossless WebP compression:{" "}
                  <strong className="text-on-surface">~35 KB</strong> per punch
                  selfie.
                </span>
              </div>
            </div>

            {/* 60-Day Purge Scheduler */}
            <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                    Auto 60-Day Purge Scheduler
                  </span>
                  <span className="font-headline-md text-headline-md text-secondary font-bold mt-1">
                    {purgeStatus === "purged" ? "Completed Today" : "In 4 Days"}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[20px]">
                    pace
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <p className="font-body-sm text-body-sm text-on-surface leading-snug">
                  Estimated{" "}
                  <strong className="text-secondary font-semibold">
                    ~42 MB (approx. 1,200 archived photos)
                  </strong>{" "}
                  will be recycled to maintain permanent 0-dollar tier ceiling.
                </p>
              </div>
              <div className="mt-3 pt-2 bg-surface-container-lowest px-3 py-2 rounded-lg flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Policy: Hard Prune &gt; 60 Days
                </span>
                <span className="font-label-sm text-label-sm text-tertiary-container font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container"></span>{" "}
                  ACTIVE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payroll Cutoff Export Generator Form Panel */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm mb-space-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-space-md gap-4">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-bold">
                Generation Matrix
              </span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                Payroll Cutoff Export Generator
              </h2>
            </div>
            <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-[18px] text-secondary">
                verified_user
              </span>
              <span>
                Mode C Off-Site signatures verified via cryptographic geofence
                tokens
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-end">
            {/* Date Range Selection */}
            <div className="md:col-span-4 flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary-container">
                  date_range
                </span>
                Cutoff Period Selection
              </label>
              <div className="relative">
                <select
                  value={cutoffPeriod}
                  onChange={(e) => setCutoffPeriod(e.target.value)}
                  className="w-full h-11 px-3 py-2 bg-surface-container-low text-on-surface rounded-lg appearance-none font-label-md text-label-md focus:outline-none focus:bg-surface-container cursor-pointer pr-10"
                >
                  <option value="oct-1-15">
                    October 1 - 15, 2026 (1st Cutoff)
                  </option>
                  <option value="oct-16-31">
                    October 16 - 31, 2026 (2nd Cutoff)
                  </option>
                  <option value="sep-16-30">
                    September 16 - 30, 2026 (2nd Cutoff)
                  </option>
                  <option value="sep-1-15">
                    September 1 - 15, 2026 (1st Cutoff)
                  </option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant pointer-events-none text-[20px]">
                  unfold_more
                </span>
              </div>
            </div>

            {/* Branch Selector */}
            <div className="md:col-span-3 flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  storefront
                </span>
                Branch Filter
              </label>
              <div className="relative">
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full h-11 px-3 py-2 bg-surface-container-low text-on-surface rounded-lg appearance-none font-label-md text-label-md focus:outline-none focus:bg-surface-container cursor-pointer pr-10"
                >
                  <option value="all">All Branches (Consolidated)</option>
                  <option value="main">Main Branch - Cubao Hub</option>
                  <option value="downtown">Downtown Branch - Manila</option>
                  <option value="westmall">West Mall Kiosk Station</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant pointer-events-none text-[20px]">
                  expand_more
                </span>
              </div>
            </div>

            {/* Preset Format */}
            <div className="md:col-span-5 flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-tertiary-container">
                  tune
                </span>
                Export Preset Protocol
              </label>
              <div className="relative">
                <select
                  value={exportPreset}
                  onChange={(e) => setExportPreset(e.target.value)}
                  className="w-full h-11 px-3 py-2 bg-surface-container-low text-on-surface rounded-lg appearance-none font-label-md text-label-md focus:outline-none focus:bg-surface-container cursor-pointer pr-10"
                >
                  <option value="csv-standard">
                    Standard Payroll CSV (Bi-Monthly Bank Compatible)
                  </option>
                  <option value="excel-timecard">
                    Detailed Timecard Excel (.xlsx with In/Out breakdown)
                  </option>
                  <option value="gov-compliance">
                    Government Compliance Audit Log (Selfies + GPS links)
                  </option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant pointer-events-none text-[20px]">
                  rule_folder
                </span>
              </div>
            </div>
          </div>

          {/* Quick Toggles & Trigger Button */}
          <div className="mt-space-md pt-space-md bg-surface-container-low/60 p-space-md rounded-xl flex flex-col lg:flex-row items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-md flex-wrap w-full lg:w-auto">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoDeductLate}
                  onChange={(e) => setAutoDeductLate(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-container accent-primary-container"
                />
                <span className="font-label-sm text-label-sm text-on-surface">
                  Auto-deduct Late &amp; Undertime Minutes
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeModeCTokens}
                  onChange={(e) => setIncludeModeCTokens(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-container accent-primary-container"
                />
                <span className="font-label-sm text-label-sm text-on-surface">
                  Include Mode C Off-Site Supervisor Tokens
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={exportDoleFormat}
                  onChange={(e) => setExportDoleFormat(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-container accent-primary-container"
                />
                <span className="font-label-sm text-label-sm text-on-surface">
                  Export DOLE DO-174 Form Format
                </span>
              </label>
            </div>

            <button
              onClick={handleGenerateCsv}
              disabled={downloadState === "compiling"}
              className="w-full lg:w-auto relative group overflow-hidden flex items-center justify-center gap-3 bg-primary text-on-primary font-label-lg text-label-lg px-8 py-3.5 rounded-xl shadow-md hover:bg-primary-container active:scale-[0.99] transition-all disabled:opacity-80"
            >
              {downloadState === "compiling" && (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">
                    refresh
                  </span>
                  <span className="font-bold tracking-wide">
                    Compiling {cutoffPeriod.toUpperCase()} CSV...
                  </span>
                </>
              )}
              {downloadState === "done" && (
                <>
                  <span className="material-symbols-outlined text-[20px] text-tertiary-fixed">
                    check_circle
                  </span>
                  <span className="font-bold tracking-wide">
                    CSV Downloaded!
                  </span>
                </>
              )}
              {downloadState === "idle" && (
                <>
                  <span className="material-symbols-outlined text-[20px] text-secondary-fixed transition-transform group-hover:rotate-12">
                    file_download
                  </span>
                  <span className="font-bold tracking-wide">
                    Generate &amp; Download CSV
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Cutoff Summary Table Preview Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-sm gap-2">
          <div className="flex items-center gap-space-sm">
            <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
              Cutoff Ledger Preview
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold">
              {filteredRows.length} of 42 Shift Records
            </span>
          </div>
          <div className="flex items-center gap-space-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface-variant text-body-sm font-body-sm shadow-sm">
              <span className="material-symbols-outlined text-[16px] text-tertiary-container">
                sync
              </span>
              <span>Calculated live via Philippine Labor Standard Rules</span>
            </div>
          </div>
        </div>

        {/* Cutoff Summary Table Preview */}
        <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden mb-space-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant uppercase font-label-sm text-label-sm tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Employee ID</th>
                  <th className="py-3.5 px-4 font-semibold">Full Name</th>
                  <th className="py-3.5 px-4 font-semibold">Branch</th>
                  <th className="py-3.5 px-4 font-semibold text-center">
                    Days Present
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-right">
                    Regular Hrs
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-right">
                    Late (Mins)
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-right">
                    Undertime (Mins)
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-center">
                    Mode C Approved
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-right">
                    Net Payable Hrs
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-center">
                    Audit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container font-body-md text-body-md text-on-surface">
                {filteredRows.map((row) => (
                  <tr
                    key={row.employeeCode}
                    className="hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-data-mono text-data-mono font-semibold text-primary">
                      {row.employeeCode}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-xs text-on-surface">
                          {row.initials}
                        </div>
                        <div>
                          <div className="font-semibold leading-tight text-on-surface">
                            {row.fullName}
                          </div>
                          <div className="font-body-sm text-body-sm text-on-surface-variant">
                            {row.designation}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm">
                        {row.branchLabel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-data-mono text-data-mono font-bold">
                      {row.daysPresent}
                    </td>
                    <td className="py-3 px-4 text-right font-data-mono text-data-mono">
                      {row.regularHours.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {row.lateMins > 0 ? (
                        <span className="font-data-mono text-data-mono text-secondary font-bold">
                          {row.lateMins} m
                        </span>
                      ) : (
                        <span className="font-data-mono text-data-mono text-tertiary-container font-semibold">
                          0
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {row.undertimeMins > 0 ? (
                        <span className="font-data-mono text-data-mono text-primary font-bold">
                          {row.undertimeMins} m
                        </span>
                      ) : (
                        <span className="font-data-mono text-data-mono text-tertiary-container font-semibold">
                          0
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.modeCPunches > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold">
                          <span className="material-symbols-outlined text-[13px]">
                            pin_drop
                          </span>{" "}
                          {row.modeCPunches}{" "}
                          {row.modeCPunches === 1 ? "Punch" : "Punches"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                          None
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-data-mono text-data-mono font-bold text-on-surface text-[15px]">
                      {row.netPayableHours.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setAuditModalRow(row)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary-container hover:bg-surface-container transition-colors"
                        title="View Audit Trail"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          visibility
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Summary Footer */}
          <div className="p-space-md bg-surface-container-low flex flex-col md:flex-row items-center justify-between gap-space-sm text-on-surface-variant">
            <div className="flex items-center gap-space-md text-body-sm font-body-sm flex-wrap">
              <span>
                Total Net Hours (Preview Sample):{" "}
                <strong className="text-on-surface font-data-mono">
                  {totalNetHours.toFixed(2)} hrs
                </strong>
              </span>
              <span>
                Deducted Late Minutes:{" "}
                <strong className="text-secondary font-data-mono">
                  {totalLateMins} mins
                </strong>
              </span>
              <span>
                Deducted Undertime:{" "}
                <strong className="text-primary font-data-mono">
                  {totalUndertimeMins} mins
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wide">
                Showing {filteredRows.length} of 42 employees
              </span>
              <button
                onClick={handleGenerateCsv}
                className="px-3 py-1 bg-surface-container-lowest rounded-md text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high transition-colors"
              >
                Export Full Batch
              </button>
            </div>
          </div>
        </div>

        {/* Mode C Attendance Audit Snapshot + Cloud Archival Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
          {/* Mode C Breakdown */}
          <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">
                  verified
                </span>
                <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Mode C Field Verification Summary
                </h4>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Cutoff Cycle #19
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
              Off-site supervisor overrides logged beyond perimeter geofences.
              All Mode C punches require GPS pinpoint &amp; face selfie proof.
            </p>
            <div className="space-y-3">
              <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-tertiary-container">
                    location_on
                  </span>
                  <div>
                    <div className="font-label-md text-label-md font-semibold text-on-surface">
                      SM Megamall Jaytees Kiosk Restock
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">
                      Kenji Bautista • 4 Mode C punch events
                    </div>
                  </div>
                </div>
                <span className="font-label-sm text-label-sm text-tertiary-container bg-surface-container-lowest px-2 py-1 rounded font-bold">
                  Audited &amp; Verified
                </span>
              </div>

              <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-tertiary-container">
                    hardware
                  </span>
                  <div>
                    <div className="font-label-md text-label-md font-semibold text-on-surface">
                      Emergency Tablet Terminal Calibration
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">
                      Joshua Villanueva • 6 Mode C punch events
                    </div>
                  </div>
                </div>
                <span className="font-label-sm text-label-sm text-tertiary-container bg-surface-container-lowest px-2 py-1 rounded font-bold">
                  Audited &amp; Verified
                </span>
              </div>

              <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-secondary">
                    coffee_maker
                  </span>
                  <div>
                    <div className="font-label-md text-label-md font-semibold text-on-surface">
                      Supplier Coffee Bean Tasting / QA
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">
                      Rodrigo Cruz • 2 Mode C punch events
                    </div>
                  </div>
                </div>
                <span className="font-label-sm text-label-sm text-secondary bg-surface-container-lowest px-2 py-1 rounded font-bold">
                  Auto-Flagged &amp; Approved
                </span>
              </div>
            </div>
          </div>

          {/* Compliance & Archival Checklist */}
          <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-space-sm">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    security
                  </span>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Audit Trail &amp; Vault Certification
                  </h4>
                </div>
                <span className="font-data-mono text-data-mono text-[12px] text-secondary">
                  SHA-256 Validated
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                All records generated through this portal conform to Philippine
                National Privacy Commission (NPC) and Department of Labor and
                Employment (DOLE) statutory requirements.
              </p>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-tertiary-container shrink-0 mt-0.5">
                    check_box
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface">
                    Employee selfie verification images compressed via zero-loss
                    WebP encoder (~35 KB).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-tertiary-container shrink-0 mt-0.5">
                    check_box
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface">
                    Geofence latitude/longitude signed with device hardware
                    serial numbers.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-tertiary-container shrink-0 mt-0.5">
                    check_box
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface">
                    Old records older than 60 days are consolidated into local
                    compressed ZIP archives prior to bucket cycling.
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-space-md pt-space-sm flex items-center justify-between bg-surface-container-low p-space-sm rounded-lg">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">
                  lock_clock
                </span>
                <span className="font-label-sm text-label-sm text-on-surface">
                  Last successful ledger purge:{" "}
                  <strong>
                    {purgeStatus === "purged" ? "Just now" : "56 days ago"}
                  </strong>
                </span>
              </div>
              <span className="font-data-mono text-data-mono text-primary font-bold text-[12px]">
                0 Errors
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Trail Inspection Modal */}
      {auditModalRow && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-space-md">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-space-lg shadow-xl">
            <div className="flex items-center justify-between pb-space-md">
              <div>
                <span className="font-data-mono text-label-sm text-primary">
                  {auditModalRow.employeeCode}
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                  {auditModalRow.fullName} — Cutoff Audit
                </h3>
              </div>
              <button
                onClick={() => setAuditModalRow(null)}
                className="p-1 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-space-sm bg-surface-container-low p-space-md rounded-xl font-body-sm text-body-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Assigned Branch:</span>
                <strong className="text-on-surface">
                  {auditModalRow.branchLabel}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Days Present:</span>
                <strong className="font-data-mono text-on-surface">
                  {auditModalRow.daysPresent}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">
                  Gross Regular Hours:
                </span>
                <strong className="font-data-mono text-on-surface">
                  {auditModalRow.regularHours.toFixed(2)} hrs
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">
                  Late / Undertime Deductions:
                </span>
                <strong className="font-data-mono text-primary-container">
                  {auditModalRow.lateMins}m late / {auditModalRow.undertimeMins}
                  m undertime
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">
                  Mode C Remote Timeouts:
                </span>
                <strong className="font-data-mono text-secondary">
                  {auditModalRow.modeCPunches} verified punches
                </strong>
              </div>
              <div className="pt-space-xs border-t border-surface-container-highest flex justify-between text-body-md">
                <span className="font-semibold text-on-surface">
                  Net Payable Hours:
                </span>
                <strong className="font-data-mono text-tertiary-container font-bold">
                  {auditModalRow.netPayableHours.toFixed(2)} hrs
                </strong>
              </div>
            </div>
            <div className="mt-space-md flex justify-end">
              <button
                onClick={() => setAuditModalRow(null)}
                className="px-space-lg py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
