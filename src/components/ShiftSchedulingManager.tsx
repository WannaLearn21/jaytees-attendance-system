"use client";

import React, { useState } from "react";
import { AccessRole, Branch, ShiftTemplate } from "@/types/attendance";

interface ShiftSchedulingManagerProps {
  role: AccessRole;
  branches: Branch[];
  shifts: ShiftTemplate[];
  onUpdateShiftGrace: (shiftId: string, gracePeriodMins: number) => void;
  onAddCustomShift?: (shift: ShiftTemplate) => void;
}

type DaySlot = "OPEN" | "MID" | "CLOSE" | "REST";

interface RosterRow {
  id: string;
  name: string;
  roleTitle: string;
  branchKey: "main" | "downtown" | "westmall";
  branchLabel: string;
  avatarUrl: string;
  days: DaySlot[];
}

const INITIAL_ROSTER: RosterRow[] = [
  {
    id: "r-1",
    name: "Carlos Mendoza",
    roleTitle: "Lead Barista",
    branchKey: "main",
    branchLabel: "Main Hub",
    avatarUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAQtB6Tz_Qrx6dhxZbeV7SxnquH5rRWGcKz5ruS55bzc2zWP6aq9rNkBzLBeQvIJ28T9fRMxrSrXTCQQZ_ZQeOtLh6gLcLYDcVzrGM61yvy_bqnWEhKyaD9l5sURASt94M92vRBPO4GPm89bQHfbnPYRcxb2DUTUk1gKTiaDdsBosBU8Q5pVb5N093hU3s1goEqdMOsZMyQlzv2ZTKi0Ih0yME14d7lSkwwbw0cXj1KX5UFwuCtUjAA",
    days: ["OPEN", "OPEN", "OPEN", "MID", "MID", "OPEN", "REST"],
  },
  {
    id: "r-2",
    name: "Maria Santos",
    roleTitle: "Kitchen Shift Lead",
    branchKey: "downtown",
    branchLabel: "Downtown",
    avatarUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBFtEHaiVewV-m3eck9x9TgSC4auxA7lkR2DoDab-EYBoYYcm5cTpX9DUW9wIOk36WFPUVgyIiuyT_LC9oh4A7V6muPlyakUEebQ4UlPnybDKHhqU2VEzqnZOQwc6OsFDf-t5ezgMcXG-c_z3O645SiTydW6Xyv4MReMapM4rxhN5fWVLSaEngvQ987-_rnIn8D1s1Sywv9G_BJqSrRe6TfY126EXd2ifj--DIQHe5iQAo2aS9nM3dz",
    days: ["CLOSE", "CLOSE", "MID", "CLOSE", "CLOSE", "MID", "CLOSE"],
  },
  {
    id: "r-3",
    name: "Joshua Dizon",
    roleTitle: "Floor Staff",
    branchKey: "westmall",
    branchLabel: "West Mall",
    avatarUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAFNQ67Jr-N35xItI0z-NVrGHGNl7R-smePWuRN2oQgHJw_eVbLe1nO31cI7c9NV2OIp_S0v8D3ZhHctRSjbTFX4KQXx_PS6t16JlYYCA968Bgxw3_yi_VAFiOmIsE-f0uBrkJhp6QT7qaUuozJ0750_7qOV6nfEpmG_HG09BkYD3RxrMlzVBTNjw6rc916oqoWHdccPfTguxa-Eiidj1foMEYwmTN09EuPAPyzJuQz2s7SRsUcmFpv",
    days: ["REST", "MID", "MID", "REST", "OPEN", "OPEN", "MID"],
  },
  {
    id: "r-4",
    name: "Angela Soriano",
    roleTitle: "Cashier Lead",
    branchKey: "main",
    branchLabel: "Main Hub",
    avatarUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDIsPF6bBuFc6xTv56zyziO8MNh6NkPo_2pGu2TjInL-pQR3qoaUiOCzrlDybI9dLcijFZUbw--VjzrzPXbAbsMO6GOrz5bAR6vRSsCScqrVNz8eY2mE0amKKbVDKh0z-SUYjda5oRwUb6MILrT9YOhPe0lGrqiLq6yyYFxK2gAfeHFCC65fNkR4X1MMeNHeQDHojsoSVeaMzR5KlxWEj6tpPq31-qSWXI8ZrcCBbOgP9n1NU2r7Jya",
    days: ["OPEN", "OPEN", "OPEN", "OPEN", "REST", "OPEN", "OPEN"],
  },
  {
    id: "r-5",
    name: "Rafael Bautista",
    roleTitle: "Barista II",
    branchKey: "westmall",
    branchLabel: "West Mall",
    avatarUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAI6JwMwwN2Qz04aEoIrM4Q89AHK9r-eMxvmaEOxNmIAuRPZAyPbqLDykHxesukLTMcbxd7W9iAC3w7HPmPXx6KYTSAWK9ylr9JjcJsGdk-UsdbBLoaSSYuBaqSOPtcvCWP8-AF0mZWEvVaTjNcqbuJ5QZlMg6mZ5uZ3sDKn1jwkbrc7rvEEkbGWaPKj_2ttOdaUqpSPpMqr66VVJlYM3IkLdpt_knCqreAkSB_Zraa8pG39FdCXoNp",
    days: ["CLOSE", "CLOSE", "CLOSE", "CLOSE", "MID", "CLOSE", "CLOSE"],
  },
];

function format12Hour(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${mStr || "00"} ${suffix}`;
}

function formatCutoffTime(startTime24: string, graceMins: number): string {
  const [hStr, mStr] = startTime24.split(":");
  const totalMins = Number(hStr) * 60 + Number(mStr || 0) + graceMins;
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")}:00 ${suffix}`;
}

export default function ShiftSchedulingManager({
  role,
  shifts,
  onUpdateShiftGrace,
  onAddCustomShift,
}: ShiftSchedulingManagerProps) {
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<
    "all" | "main" | "downtown" | "westmall"
  >("all");
  const [roster, setRoster] = useState<RosterRow[]>(INITIAL_ROSTER);
  const [weekOffset, setWeekOffset] = useState(0);

  // Grace Period Adjustment Modal State
  const [editingShift, setEditingShift] = useState<ShiftTemplate | null>(null);
  const [tempGraceValue, setTempGraceValue] = useState<number>(15);

  // Add Custom Shift Modal State
  const [showNewShiftModal, setShowNewShiftModal] = useState(false);
  const [newShiftName, setNewShiftName] = useState("");
  const [newShiftStart, setNewShiftStart] = useState("06:00");
  const [newShiftEnd, setNewShiftEnd] = useState("15:00");
  const [newShiftGrace, setNewShiftGrace] = useState(15);

  // Toast State
  const [toast, setToast] = useState<{ title: string; message: string } | null>(
    null
  );

  const showToast = (title: string, message: string) => {
    setToast({ title, message });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  // Deduplicate shifts by name for the 3 Core Shift Cards display
  const coreShifts: ShiftTemplate[] = [];
  const seenNames = new Set<string>();
  shifts.forEach((s) => {
    if (!seenNames.has(s.name)) {
      seenNames.add(s.name);
      coreShifts.push(s);
    }
  });

  const handleOpenGraceModal = (shift: ShiftTemplate) => {
    setEditingShift(shift);
    setTempGraceValue(shift.gracePeriodMins);
  };

  const handleSaveGraceAdjustment = () => {
    if (!editingShift) return;
    // Update all shifts matching this template name across branches
    shifts
      .filter((s) => s.name === editingShift.name)
      .forEach((s) => onUpdateShiftGrace(s.id, tempGraceValue));
    setEditingShift(null);
    showToast(
      "Grace Policy Updated",
      `Threshold (${tempGraceValue}m) written to Supabase cache. Applied to real-time biometric punching.`
    );
  };

  const handleCreateCustomShift = () => {
    const cleanName = newShiftName.trim() || "Weekend Peak Shift";
    const created: ShiftTemplate = {
      id: `s-custom-${Date.now()}`,
      branchId: "b-main",
      name: cleanName,
      badgeText: "Custom Slot",
      description:
        "Custom operational schedule configured via Roster Engine Matrix.",
      startTime: newShiftStart,
      endTime: newShiftEnd,
      gracePeriodMins: newShiftGrace,
    };
    onAddCustomShift?.(created);
    setShowNewShiftModal(false);
    setNewShiftName("");
    showToast(
      "Custom Shift Created",
      `"${cleanName}" template active and visible in the weekly roster scheduling board.`
    );
  };

  const cycleRosterDay = (rowId: string, dayIdx: number) => {
    if (role === "USER") return;
    const order: DaySlot[] = ["OPEN", "MID", "CLOSE", "REST"];
    setRoster((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const current = row.days[dayIdx];
        const next = order[(order.indexOf(current) + 1) % order.length];
        const updatedDays = [...row.days];
        updatedDays[dayIdx] = next;
        return { ...row, days: updatedDays };
      })
    );
  };

  const filteredRoster = roster.filter(
    (r) =>
      selectedBranchFilter === "all" || r.branchKey === selectedBranchFilter
  );

  return (
    <div className="flex flex-col w-full">
      {/* Top Command Banner / Metadata Strip */}
      <div className="w-full flex flex-col xl:flex-row xl:items-end justify-between gap-space-md pb-space-lg">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="font-data-mono text-data-mono text-secondary uppercase font-bold tracking-widest">
              OP-MODULE // 03
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              Roster Engine &amp; Compliance Matrix
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-extrabold tracking-tight">
            Shift Scheduling &amp; Grace Period Manager
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
            Configure operational slot tolerances across Main, Downtown, and
            West Mall. Real-time Philippine Labor Code compliance rules enforce
            automatic meal deductions and late-penalty triggers.
          </p>
        </div>

        {/* Global Roster Actions */}
        <div className="flex flex-wrap items-center gap-space-sm">
          <div className="bg-surface-container-lowest shadow-sm rounded-xl p-space-xs flex items-center gap-space-xs">
            {(
              [
                { key: "all", label: "All Branches" },
                { key: "main", label: "Main Hub" },
                { key: "downtown", label: "Downtown" },
                { key: "westmall", label: "West Mall" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setSelectedBranchFilter(tab.key);
                  showToast(
                    "Filtering View",
                    `Displaying rosters and slot tolerances for: ${tab.label.toUpperCase()}`
                  );
                }}
                className={`px-space-md py-space-xs rounded-lg font-label-md text-label-md transition-all ${
                  selectedBranchFilter === tab.key
                    ? "bg-primary-container text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() =>
              showToast(
                "Policy Replicated",
                "All 3 baseline shifts cloned successfully to West Mall, Downtown, and Main Hub."
              )
            }
            className="h-12 px-space-md rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container font-label-lg text-label-lg flex items-center gap-space-xs shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">
              content_copy
            </span>
            <span>Clone to All Branches</span>
          </button>

          <button
            onClick={() => setShowNewShiftModal(true)}
            className="h-12 px-space-lg rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg flex items-center gap-space-xs shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">
              add_circle
            </span>
            <span>Add Custom Shift Template</span>
          </button>
        </div>
      </div>

      {/* Operational Metrics Strip (4-Up Bento Highlight) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md pb-space-xl">
        {/* Metric 1: Scheduled Headcount */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary"></div>
          <div className="flex items-center justify-between pb-space-sm">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
              Weekly Target Headcount
            </span>
            <span className="material-symbols-outlined text-secondary text-[20px]">
              groups
            </span>
          </div>
          <div className="flex items-baseline gap-space-xs">
            <span className="font-display-lg text-display-lg font-bold text-on-surface">
              36
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">
              / 38 Assigned
            </span>
          </div>
          <div className="mt-space-sm flex items-center justify-between font-label-sm text-label-sm">
            <span className="text-tertiary-container font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">
                check_circle
              </span>{" "}
              94.7% Coverage
            </span>
            <span className="text-on-surface-variant">2 Open Slots</span>
          </div>
        </div>

        {/* Metric 2: Standard Roster Hours */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary-container"></div>
          <div className="flex items-center justify-between pb-space-sm">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
              Allocated Net Hours
            </span>
            <span className="material-symbols-outlined text-secondary-container text-[20px]">
              timelapse
            </span>
          </div>
          <div className="flex items-baseline gap-space-xs">
            <span className="font-display-lg text-display-lg font-bold text-on-surface">
              1,728
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">
              Hrs
            </span>
          </div>
          <div className="mt-space-sm flex items-center justify-between font-label-sm text-label-sm">
            <span className="text-on-surface-variant">
              Weekly Baseline: 48h / Staff
            </span>
            <span className="text-secondary font-semibold">Net of Meals</span>
          </div>
        </div>

        {/* Metric 3: Overtime Trigger Risk */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary-container"></div>
          <div className="flex items-center justify-between pb-space-sm">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
              Overtime Flagged
            </span>
            <span className="material-symbols-outlined text-primary-container text-[20px]">
              warning
            </span>
          </div>
          <div className="flex items-baseline gap-space-xs">
            <span className="font-display-lg text-display-lg font-bold text-primary-container">
              3
            </span>
            <span className="font-label-md text-label-md text-primary-container font-medium">
              Employees &gt; 48 Hrs
            </span>
          </div>
          <div className="mt-space-sm flex items-center justify-between font-label-sm text-label-sm">
            <span className="text-primary-container font-semibold">
              +18.5 OT Est. Hrs
            </span>
            <span className="text-on-surface-variant">Requires Approval</span>
          </div>
        </div>

        {/* Metric 4: Buffer & Grace Compliance */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-tertiary-container"></div>
          <div className="flex items-center justify-between pb-space-sm">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
              Grace Window Standard
            </span>
            <span className="material-symbols-outlined text-tertiary-container text-[20px]">
              verified_user
            </span>
          </div>
          <div className="flex items-baseline gap-space-xs">
            <span className="font-display-lg text-display-lg font-bold text-tertiary-container">
              10-15
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">
              Mins Window
            </span>
          </div>
          <div className="mt-space-sm flex items-center justify-between font-label-sm text-label-sm">
            <span className="text-tertiary-container font-semibold">
              Automatic Cutoff
            </span>
            <span className="text-on-surface-variant font-data-mono">
              07:15 | 10:15 | 13:10
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: SHIFT TEMPLATES CONFIGURATION MATRIX */}
      <div className="flex flex-col gap-space-md pb-space-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="w-2 h-6 bg-primary-container rounded-full"></div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
              Standard Shift Templates &amp; Policy Tolerances
            </h2>
          </div>
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[16px] text-tertiary-container">
              sync_alt
            </span>
            <span>Auto-synced with Supabase Edge Attendance Processor</span>
          </div>
        </div>

        {/* Core Shift Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          {coreShifts.map((shift, idx) => {
            const start12 = format12Hour(shift.startTime);
            const end12 = format12Hour(shift.endTime);
            const cutoffStr = formatCutoffTime(
              shift.startTime,
              shift.gracePeriodMins
            );

            const badgeStyles =
              idx === 0
                ? "bg-secondary-fixed text-on-secondary-fixed"
                : idx === 1
                ? "bg-surface-container-high text-on-surface"
                : "bg-primary-fixed text-on-primary-fixed";

            const badgeIcon =
              idx === 0
                ? "wb_twilight"
                : idx === 1
                ? "lunch_dining"
                : "nightlight";

            const topRightIcon =
              idx === 0 ? "wb_sunny" : idx === 1 ? "schedule" : "bedtime";

            const topRightColor =
              idx === 0
                ? "text-secondary"
                : idx === 1
                ? "text-primary-container"
                : "text-tertiary-container";

            return (
              <div
                key={shift.id}
                className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col justify-between relative group hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-space-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <div
                        className={`inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full font-label-sm text-label-sm font-semibold uppercase mb-space-xs ${badgeStyles}`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {badgeIcon}
                        </span>{" "}
                        {shift.badgeText}
                      </div>
                      <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                        {shift.name}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {shift.description}
                      </p>
                    </div>
                    <div
                      className={`p-space-xs rounded-lg bg-surface-container ${topRightColor}`}
                    >
                      <span className="material-symbols-outlined text-[24px]">
                        {topRightIcon}
                      </span>
                    </div>
                  </div>

                  {/* Schedule Metrics */}
                  <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Nominal Window
                      </span>
                      <span className="font-data-mono text-data-mono font-bold text-on-surface">
                        {start12} – {end12}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Unpaid Meal Break
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                        1 hr Auto-Deducted
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Calculated Paid Hours
                      </span>
                      <span className="font-data-mono text-data-mono text-primary font-bold">
                        8.00 Net Hours
                      </span>
                    </div>
                  </div>

                  {/* Grace Period Micro-Engine */}
                  <div className="rounded-lg bg-surface-bright p-space-md shadow-sm flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-secondary text-[18px]">
                          timer
                        </span>
                        <span className="font-label-md text-label-md font-bold text-on-surface">
                          Grace Period Tolerance
                        </span>
                      </div>
                      <span className="font-data-mono text-data-mono text-secondary font-bold px-2 py-0.5 bg-secondary-fixed rounded">
                        {shift.gracePeriodMins} Mins
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      Punches up to{" "}
                      <span className="font-data-mono text-tertiary-container font-semibold">
                        {cutoffStr}
                      </span>{" "}
                      count as on-time. Late penalty clock activates
                      immediately past cutoff for full differential.
                    </p>
                    <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden flex">
                      <div className="bg-tertiary-container h-full w-[25%]"></div>
                      <div className="bg-secondary h-full w-[15%]"></div>
                      <div className="bg-primary-container h-full w-[60%]"></div>
                    </div>
                    <div className="flex justify-between font-label-sm text-[10px] text-on-surface-variant">
                      <span>{start12}</span>
                      <span className="text-secondary font-bold">
                        +{shift.gracePeriodMins}m (Cutoff)
                      </span>
                      <span className="text-primary-container">
                        Late Accumulation
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-space-md mt-space-md flex items-center justify-between">
                  <button
                    onClick={() => handleOpenGraceModal(shift)}
                    className="font-label-md text-label-md text-secondary hover:text-on-secondary-fixed-variant flex items-center gap-1 font-semibold transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      tune
                    </span>{" "}
                    Adjust Grace Window
                  </button>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Branches:{" "}
                    <strong className="text-on-surface font-semibold">
                      All 3 Active
                    </strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: AUTOMATED CALCULATION PREVIEW ENGINE */}
      <div className="w-full pb-space-xl">
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-md">
            <div>
              <div className="flex items-center gap-space-xs">
                <span className="px-space-xs py-0.5 rounded bg-tertiary-container text-on-tertiary font-label-sm text-label-sm font-semibold uppercase">
                  Zero Manual Math
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Rule ID: JATS-PST-CALC-V1.1
                </span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold mt-1">
                Real-Time Attendance Logic &amp; Penalty Formula Simulator
              </h2>
            </div>
            <div className="flex items-center gap-space-sm">
              <div className="bg-surface-container-low px-space-md py-space-xs rounded-lg flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  verified
                </span>
                <span className="font-label-md text-label-md font-semibold text-on-surface">
                  Auto-Deduct 60-min Lunch Active
                </span>
              </div>
            </div>
          </div>

          {/* Visual Interactive Logic Flow */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-space-md pt-space-xs">
            {/* Step 1 */}
            <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-space-xs">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase">
                    Punch In State
                  </span>
                  <span className="w-5 h-5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-center font-label-sm text-[11px] leading-5 font-bold">
                    1
                  </span>
                </div>
                <div className="font-data-mono text-headline-sm text-headline-sm font-bold text-on-surface">
                  07:24 AM
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">
                  Employee scanned selfie at Main Branch for Opening Shift
                  (07:00 AM target).
                </p>
              </div>
              <div className="mt-space-md pt-space-xs flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Grace (15m):
                </span>
                <span className="font-label-sm text-label-sm text-primary font-bold">
                  Exceeded by 9m
                </span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-space-md rounded-lg bg-error-container text-on-error-container flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-space-xs">
                  <span className="font-label-sm text-label-sm uppercase font-semibold">
                    Tardiness Calculation
                  </span>
                  <span className="w-5 h-5 rounded-full bg-primary-container text-on-primary text-center font-label-sm text-[11px] leading-5 font-bold">
                    2
                  </span>
                </div>
                <div className="font-data-mono text-headline-sm text-headline-sm font-bold">
                  24 Minutes Late
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">
                  Policy applies full elapsed difference from nominal shift
                  start (07:00 AM) once grace is breached.
                </p>
              </div>
              <div className="mt-space-md pt-space-xs flex items-center justify-between">
                <span className="font-label-sm text-label-sm">
                  Deduction Weight:
                </span>
                <span className="font-label-sm text-label-sm font-bold">
                  0.40 Hours Late
                </span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-space-xs">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase">
                    Punch Out &amp; Meal
                  </span>
                  <span className="w-5 h-5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-center font-label-sm text-[11px] leading-5 font-bold">
                    3
                  </span>
                </div>
                <div className="font-data-mono text-headline-sm text-headline-sm font-bold text-on-surface">
                  04:00 PM
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">
                  Nominal out scan registered. Automatic 60 min meal allowance
                  deducted without manual sign-off.
                </p>
              </div>
              <div className="mt-space-md pt-space-xs flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Gross Duration:
                </span>
                <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                  8h 36m On-Site
                </span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-space-md rounded-lg bg-secondary-fixed text-on-secondary-fixed flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-space-xs">
                  <span className="font-label-sm text-label-sm uppercase font-semibold">
                    Net Regular Payroll
                  </span>
                  <span className="w-5 h-5 rounded-full bg-secondary text-on-secondary text-center font-label-sm text-[11px] leading-5 font-bold">
                    4
                  </span>
                </div>
                <div className="font-data-mono text-headline-sm text-headline-sm font-bold">
                  7.60 Paid Hrs
                </div>
                <p className="font-body-sm text-body-sm text-on-secondary-fixed-variant mt-space-xs">
                  Final equation:{" "}
                  <code>8.00 Nominal - 0.40 Tardiness = 7.60 Net Payable Hours</code>
                  . Ready for CSV Export.
                </p>
              </div>
              <div className="mt-space-md pt-space-xs flex items-center justify-between">
                <span className="font-label-sm text-label-sm">
                  Undertime Penalty:
                </span>
                <span className="font-label-sm text-label-sm font-bold">
                  0 Minutes
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: WEEKLY ROSTER & SCHEDULE PLANNER (7-DAY MATRIX) */}
      <div className="flex flex-col gap-space-md pb-space-xl">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-2 h-6 bg-secondary rounded-full"></div>
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                Weekly Roster &amp; Schedule Planner
              </h2>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Sprint Cycle: Oct 23 – Oct 29, 2026 (PST Manila Schedule • Click
                any slot to cycle shift)
              </span>
            </div>
          </div>

          {/* Quick Legend & Filtering */}
          <div className="flex flex-wrap items-center gap-space-sm">
            <div className="flex items-center gap-space-xs text-label-sm font-label-sm text-on-surface-variant bg-surface-container-lowest px-space-sm py-space-xs rounded-lg shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary-fixed-dim"></span>
              <span>Opening (07:00)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-surface-container-highest ml-space-xs"></span>
              <span>Mid (10:00)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-primary-fixed-dim ml-space-xs"></span>
              <span>Closing (13:00)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-surface-dim ml-space-xs"></span>
              <span>OFF</span>
            </div>
            <div className="flex items-center gap-space-xs">
              <button
                onClick={() => {
                  setWeekOffset((w) => w - 1);
                  showToast(
                    "Schedule Board Updated",
                    "Loaded previous sprint cycle roster."
                  );
                }}
                className="w-9 h-9 rounded-lg bg-surface-container-lowest hover:bg-surface-container flex items-center justify-center text-on-surface shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">
                  chevron_left
                </span>
              </button>
              <span className="font-label-md text-label-md font-bold text-on-surface px-space-xs">
                {weekOffset === 0
                  ? "Current Week"
                  : weekOffset > 0
                  ? `Week +${weekOffset}`
                  : `Week ${weekOffset}`}
              </span>
              <button
                onClick={() => {
                  setWeekOffset((w) => w + 1);
                  showToast(
                    "Schedule Board Updated",
                    "Loaded upcoming sprint cycle roster."
                  );
                }}
                className="w-9 h-9 rounded-lg bg-surface-container-lowest hover:bg-surface-container flex items-center justify-center text-on-surface shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 7-Day Interactive Visual Roster Board */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-space-md px-space-md font-semibold w-64 sticky left-0 bg-surface-container-low z-20">
                    Staff Member &amp; Branch
                  </th>
                  {[
                    { day: "Mon", date: "Oct 23" },
                    { day: "Tue", date: "Oct 24" },
                    { day: "Wed", date: "Oct 25" },
                    { day: "Thu", date: "Oct 26" },
                    { day: "Fri", date: "Oct 27" },
                    { day: "Sat", date: "Oct 28" },
                    { day: "Sun", date: "Oct 29" },
                  ].map((col) => (
                    <th
                      key={col.day}
                      className="py-space-md px-space-sm font-semibold text-center"
                    >
                      {col.day}{" "}
                      <span className="font-normal block text-[10px]">
                        {col.date}
                      </span>
                    </th>
                  ))}
                  <th className="py-space-md px-space-md font-semibold text-right w-44">
                    Total / Variance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-none text-body-sm font-body-sm">
                {filteredRoster.map((row) => {
                  const workedDays = row.days.filter(
                    (d) => d !== "REST"
                  ).length;
                  const totalHours = workedDays * 8;

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-surface-container-low transition-colors group"
                    >
                      <td className="py-space-md px-space-md sticky left-0 bg-surface-container-lowest group-hover:bg-surface-container-low z-10">
                        <div className="flex items-center gap-space-sm">
                          <img
                            src={row.avatarUrl}
                            alt={row.name}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-label-md text-label-md font-bold text-on-surface truncate">
                              {row.name}
                            </span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                              {row.roleTitle} • {row.branchLabel}
                            </span>
                          </div>
                        </div>
                      </td>

                      {row.days.map((slot, dayIdx) => {
                        const slotStyle =
                          slot === "OPEN"
                            ? "bg-secondary-fixed text-on-secondary-fixed font-bold"
                            : slot === "MID"
                            ? "bg-surface-container-highest text-on-surface font-bold"
                            : slot === "CLOSE"
                            ? "bg-primary-fixed text-on-primary-fixed font-bold"
                            : "bg-surface-container-high text-on-surface-variant font-semibold";

                        const subText =
                          slot === "OPEN"
                            ? "7a-4p (8h)"
                            : slot === "MID"
                            ? "10a-7p (8h)"
                            : slot === "CLOSE"
                            ? "1p-10p (8h)"
                            : "OFF";

                        return (
                          <td
                            key={dayIdx}
                            onClick={() => cycleRosterDay(row.id, dayIdx)}
                            className="p-space-xs text-center cursor-pointer select-none"
                            title="Click to cycle shift assignment"
                          >
                            <div
                              className={`p-space-xs rounded font-label-sm text-[11px] transition-transform active:scale-95 ${slotStyle}`}
                            >
                              {slot}
                              <div className="text-[9px] font-normal opacity-80">
                                {subText}
                              </div>
                            </div>
                          </td>
                        );
                      })}

                      <td className="py-space-md px-space-md text-right">
                        <div className="flex flex-col items-end">
                          <span
                            className={`font-data-mono text-label-lg font-bold ${
                              totalHours > 48
                                ? "text-primary-container"
                                : totalHours < 48
                                ? "text-secondary"
                                : "text-tertiary-container"
                            }`}
                          >
                            {totalHours.toFixed(1)} Hrs
                          </span>
                          {totalHours === 48 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-label-sm font-semibold text-tertiary-container">
                              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container"></span>{" "}
                              Target Met
                            </span>
                          )}
                          {totalHours > 48 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-[10px] font-bold">
                              <span className="material-symbols-outlined text-[12px]">
                                warning
                              </span>{" "}
                              +{(totalHours - 48).toFixed(1)}h OT Warning
                            </span>
                          )}
                          {totalHours < 48 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[10px] font-bold">
                              <span className="material-symbols-outlined text-[12px]">
                                info
                              </span>{" "}
                              -{(48 - totalHours).toFixed(1)}h Under-time
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Schedule Board Footer Status */}
          <div className="p-space-md bg-surface-container-low flex flex-col md:flex-row items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-sm">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                Weekly Target Rule:
              </span>
              <span className="font-data-mono text-label-sm text-label-sm bg-surface-container-lowest px-2 py-0.5 rounded shadow-sm text-on-surface">
                48 Hours (6 Days × 8 Hours/Day)
              </span>
              <span className="hidden md:inline font-body-sm text-body-sm text-on-surface-variant">
                • 1 Mandatory Weekly Rest Day Enforced
              </span>
            </div>
            <div className="flex items-center gap-space-sm">
              <button
                onClick={() =>
                  showToast(
                    "Roster Transmitted",
                    "Weekly matrix formatted for print & pushed to Jaytees Senior Punch Station simulators."
                  )
                }
                className="h-10 px-space-md rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1 shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">
                  print
                </span>{" "}
                Print Slot Matrix
              </button>
              <button
                onClick={() =>
                  showToast(
                    "Roster Transmitted",
                    "Weekly matrix pushed to Jaytees Senior Punch Station simulators."
                  )
                }
                className="h-10 px-space-md rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md flex items-center gap-1 shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">
                  send
                </span>{" "}
                Publish Roster to Mobile Kiosks
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: ADJUST GRACE PERIOD */}
      {editingShift && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-space-md">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-space-lg shadow-xl relative">
            <div className="flex items-center justify-between pb-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[24px]">
                  timer
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                  Adjust Grace: {editingShift.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingShift(null)}
                className="p-space-xs text-on-surface-variant hover:text-on-surface rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-space-md">
              <div className="p-space-sm rounded-lg bg-surface-container-low flex justify-between items-center font-data-mono text-label-md">
                <span className="text-on-surface-variant">Shift Window:</span>
                <span className="font-bold text-on-surface">
                  {format12Hour(editingShift.startTime)} –{" "}
                  {format12Hour(editingShift.endTime)}
                </span>
              </div>

              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-semibold">
                  Configurable Grace Window (Minutes)
                </label>
                <div className="flex items-center gap-space-sm">
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={5}
                    value={tempGraceValue}
                    onChange={(e) => setTempGraceValue(Number(e.target.value))}
                    className="w-full accent-primary-container cursor-pointer"
                  />
                  <span className="font-data-mono text-headline-sm font-bold text-secondary w-16 text-right">
                    {tempGraceValue}m
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Tolerance threshold before automated tardiness accumulation
                  begins.
                </span>
              </div>

              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-semibold">
                  Tardiness Calculation Policy
                </label>
                <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
                  <label className="flex items-center gap-space-sm cursor-pointer">
                    <input
                      type="radio"
                      name="graceRule"
                      defaultChecked
                      className="w-4 h-4 text-primary-container accent-primary-container"
                    />
                    <span className="font-label-md text-label-md text-on-surface">
                      Full Retroactive (Subtract from 00m upon breach)
                    </span>
                  </label>
                  <label className="flex items-center gap-space-sm cursor-pointer">
                    <input
                      type="radio"
                      name="graceRule"
                      className="w-4 h-4 text-primary-container accent-primary-container"
                    />
                    <span className="font-label-md text-label-md text-on-surface">
                      Grace Deducted (Penalize only minutes past threshold)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-space-xs pt-space-xs text-on-surface-variant font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[16px] text-tertiary-container">
                  lock
                </span>
                <span>
                  Requires SysAd (3-Tier RBAC) signature to write to Postgres.
                </span>
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-space-md">
                <button
                  onClick={() => setEditingShift(null)}
                  className="h-11 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGraceAdjustment}
                  className="h-11 px-space-lg rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md transition-all shadow-sm"
                >
                  Save &amp; Propagate Rules
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD CUSTOM SHIFT TEMPLATE */}
      {showNewShiftModal && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-space-md">
          <div className="bg-surface-container-lowest rounded-xl max-w-xl w-full p-space-lg shadow-xl relative">
            <div className="flex items-center justify-between pb-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary-container text-[24px]">
                  add_circle
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                  New Shift Template Definition
                </h3>
              </div>
              <button
                onClick={() => setShowNewShiftModal(false)}
                className="p-space-xs text-on-surface-variant hover:text-on-surface rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div className="flex flex-col gap-space-xs md:col-span-2">
                <label className="font-label-md text-label-md text-on-surface font-semibold">
                  Shift Name / Purpose
                </label>
                <input
                  type="text"
                  value={newShiftName}
                  onChange={(e) => setNewShiftName(e.target.value)}
                  placeholder="e.g. Midnight Cleaning Shift / Weekend Peak"
                  className="h-11 px-space-md rounded-lg bg-surface-bright text-on-surface font-body-md text-body-md shadow-sm outline-none focus:bg-surface-container-lowest"
                />
              </div>
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-semibold">
                  Nominal Punch In Time
                </label>
                <input
                  type="time"
                  value={newShiftStart}
                  onChange={(e) => setNewShiftStart(e.target.value)}
                  className="h-11 px-space-md rounded-lg bg-surface-bright text-on-surface font-data-mono text-data-mono shadow-sm outline-none"
                />
              </div>
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-semibold">
                  Nominal Punch Out Time
                </label>
                <input
                  type="time"
                  value={newShiftEnd}
                  onChange={(e) => setNewShiftEnd(e.target.value)}
                  className="h-11 px-space-md rounded-lg bg-surface-bright text-on-surface font-data-mono text-data-mono shadow-sm outline-none"
                />
              </div>
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-semibold">
                  Grace Window (Mins)
                </label>
                <select
                  value={newShiftGrace}
                  onChange={(e) => setNewShiftGrace(Number(e.target.value))}
                  className="h-11 px-space-md rounded-lg bg-surface-bright text-on-surface font-body-md text-body-md shadow-sm outline-none"
                >
                  <option value={5}>5 Minutes</option>
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes (Standard)</option>
                  <option value={20}>20 Minutes</option>
                </select>
              </div>
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-semibold">
                  Meal Deduction
                </label>
                <select className="h-11 px-space-md rounded-lg bg-surface-bright text-on-surface font-body-md text-body-md shadow-sm outline-none">
                  <option value={60}>60 Minutes (Unpaid mandatory)</option>
                  <option value={30}>30 Minutes (Short shift)</option>
                  <option value={0}>0 Minutes (Continuous 4-hr)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-space-sm pt-space-lg mt-space-md">
              <button
                onClick={() => setShowNewShiftModal(false)}
                className="h-11 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomShift}
                className="h-11 px-space-lg rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md transition-all shadow-sm"
              >
                Save &amp; Deploy Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-inverse-surface text-inverse-on-surface px-space-lg py-space-md rounded-xl shadow-xl flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-tertiary-fixed text-[22px]">
              check_circle
            </span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md font-bold">
                {toast.title}
              </span>
              <span className="font-body-sm text-body-sm text-inverse-on-surface/80">
                {toast.message}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
