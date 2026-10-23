"use client";

import React, { useState } from "react";
import {
  AccessRole,
  AttendanceLog,
  Branch,
  Employee,
  ShiftTemplate,
} from "@/types/attendance";
import { formatTime12h } from "@/lib/geo";
import {
  Building2,
  CalendarClock,
  Camera,
  CheckCircle2,
  Clock,
  Download,
  MapPin,
  Plus,
  Shield,
  Users,
} from "lucide-react";

interface AdminDashboardProps {
  currentUser: Employee;
  branches: Branch[];
  shifts: ShiftTemplate[];
  employees: Employee[];
  logs: AttendanceLog[];
  onToggleEmployeeOffsiteModeC: (employeeId: string) => void;
  onToggleEmployeeMultiBranch: (employeeId: string) => void;
  onChangeEmployeeShift: (employeeId: string, shiftId: string) => void;
  onAddEmployee: (newEmp: Employee) => void;
  onAddShiftTemplate: (newShift: ShiftTemplate) => void;
  onUpdateShiftTemplate: (updatedShift: ShiftTemplate) => void;
}

export function AdminDashboard({
  currentUser,
  branches,
  shifts,
  employees,
  logs,
  onToggleEmployeeOffsiteModeC,
  onToggleEmployeeMultiBranch,
  onChangeEmployeeShift,
  onAddEmployee,
  onAddShiftTemplate,
  onUpdateShiftTemplate,
}: AdminDashboardProps) {
  const isSysAd = currentUser.role === "SYSAD";
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isSysAd ? "ALL" : currentUser.branchId
  );
  const [activeSubTab, setActiveSubTab] = useState<
    "timecards" | "employees" | "shifts"
  >("timecards");

  // New Employee Form State
  const [empCode, setEmpCode] = useState("");
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState<AccessRole>("USER");
  const [empBranchId, setEmpBranchId] = useState(currentUser.branchId);
  const [empShiftId, setEmpShiftId] = useState("");
  const [empOffsite, setEmpOffsite] = useState(false);
  const [empMultiBranch, setEmpMultiBranch] = useState(false);

  // New Shift Form State
  const [shiftBranchId, setShiftBranchId] = useState(currentUser.branchId);
  const [shiftName, setShiftName] = useState("");
  const [shiftStart, setShiftStart] = useState("08:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");
  const [shiftGrace, setShiftGrace] = useState(10);

  // Scoped Filtering (Branch Admin only sees their branch; SysAd can view ALL or filter by branch)
  const effectiveBranchFilter = isSysAd
    ? selectedBranchId
    : currentUser.branchId;

  const filteredLogs = logs.filter((l) =>
    effectiveBranchFilter === "ALL"
      ? true
      : l.branchId === effectiveBranchFilter
  );

  const filteredEmployees = employees.filter((e) =>
    effectiveBranchFilter === "ALL"
      ? true
      : e.branchId === effectiveBranchFilter
  );

  const filteredShifts = shifts.filter((s) =>
    effectiveBranchFilter === "ALL"
      ? true
      : s.branchId === effectiveBranchFilter
  );

  // KPI Metrics
  const totalPresent = filteredLogs.length;
  const totalCompleted = filteredLogs.filter((l) => Boolean(l.timeOutAt)).length;
  const totalLate = filteredLogs.filter((l) => l.lateMinutes > 0).length;
  const totalOffsiteModeC = filteredLogs.filter(
    (l) => l.isOffsiteTimeout
  ).length;

  // Export Payroll CSV
  const handleExportCsv = () => {
    const headers = [
      "Date",
      "Employee Code",
      "Employee Name",
      "Branch",
      "Shift",
      "Scheduled Start",
      "Scheduled End",
      "Time In",
      "Time In Distance (m)",
      "Late (Mins)",
      "Time Out",
      "Time Out Distance (m)",
      "Mode C Off-Site Time Out",
      "Off-Site Note",
      "Undertime (Mins)",
      "Total Hours",
    ];

    const rows = filteredLogs.map((l) => [
      l.dateKey,
      l.employeeCode,
      `"${l.employeeName}"`,
      `"${l.branchName}"`,
      `"${l.shiftName}"`,
      l.shiftStart,
      l.shiftEnd,
      new Date(l.timeInAt).toLocaleTimeString(),
      l.timeInDistanceM,
      l.lateMinutes,
      l.timeOutAt ? new Date(l.timeOutAt).toLocaleTimeString() : "ACTIVE",
      l.timeOutDistanceM ?? "",
      l.isOffsiteTimeout ? "YES (MODE C)" : "NO (IN-STORE)",
      `"${l.offsiteNote || ""}"`,
      l.undertimeMinutes,
      l.totalHours,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `jaytees-payroll-${effectiveBranchFilter.toLowerCase()}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empCode.trim() || !empName.trim()) return;

    const targetBranch = isSysAd ? empBranchId : currentUser.branchId;
    const defaultShift =
      shifts.find((s) => s.id === empShiftId) ||
      shifts.find((s) => s.branchId === targetBranch) ||
      shifts[0];

    const newEmployee: Employee = {
      id: `emp-${Date.now()}`,
      employeeCode: empCode.trim().toUpperCase(),
      fullName: empName.trim(),
      designation: empOffsite ? "Field / Logistics Staff" : "Store Operations Staff",
      role: isSysAd ? empRole : "USER",
      branchId: targetBranch,
      shiftId: defaultShift.id,
      allowOffsiteTimeout: empOffsite,
      allowMultiBranch: empMultiBranch,
      pinCode: "1234",
      avatarUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuC2vqX2j3AMauprhPv42sfB4A5WuFlsvGOxO-vKyDBj6v6W7gi8Ka05erA3Y0MliuPEmD0Mh5QjIK_AAAqOwnt5hehmjBYShT3z6jQODBXCLsIcdlKmdcTnzIOz_YrcrWD4bZiv2g1vTRTXvYUf7_V6kZF0qSjjFh_VFeeQQPzPodql6kGb5dlvnun9158lQ9-ldrv73qbKfxCBgF_SSLlD8WInFT5SNREF25Ypee--XyWEdak-gCo-",
      isActive: true,
    };

    onAddEmployee(newEmployee);
    setEmpCode("");
    setEmpName("");
    setEmpOffsite(false);
    setEmpMultiBranch(false);
  };

  const handleCreateShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftName.trim()) return;
    const targetBranch = isSysAd ? shiftBranchId : currentUser.branchId;

    const newShift: ShiftTemplate = {
      id: `shift-${Date.now()}`,
      branchId: targetBranch,
      name: shiftName.trim(),
      badgeText: "Custom Shift",
      description: "Custom branch shift template.",
      startTime: shiftStart,
      endTime: shiftEnd,
      gracePeriodMins: Number(shiftGrace) || 0,
    };

    onAddShiftTemplate(newShift);
    setShiftName("");
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Branch Scope & Export Payroll CSV */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-500/30">
              {isSysAd
                ? "Level 1: System Admin Multi-Branch View"
                : "Level 2: Branch Admin View"}
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-extrabold text-white">
            {effectiveBranchFilter === "ALL"
              ? "All 3 Branches — Attendance & Time Card Monitor"
              : branches.find((b) => b.id === effectiveBranchFilter)?.name}
          </h2>
          <p className="text-xs text-slate-400">
            Replaces physical time cards with photo-verified, geofenced digital
            attendance logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isSysAd && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="rounded-xl border border-slate-600 bg-slate-950 px-3.5 py-2.5 text-sm font-bold text-white focus:border-sky-400 focus:outline-none"
            >
              <option value="ALL">All 3 Branches ({logs.length} logs)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-500"
          >
            <Download className="h-4 w-4" />
            <span>Export Payroll CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
          <div className="text-xs font-bold uppercase text-slate-400">
            Timed In Today
          </div>
          <div className="mt-1 text-3xl font-black text-emerald-400">
            {totalPresent}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Verified inside branch vicinity
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
          <div className="text-xs font-bold uppercase text-slate-400">
            Completed Shifts
          </div>
          <div className="mt-1 text-3xl font-black text-sky-400">
            {totalCompleted}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Both Time In & Time Out logged
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
          <div className="text-xs font-bold uppercase text-slate-400">
            Late Arrivals
          </div>
          <div className="mt-1 text-3xl font-black text-rose-400">
            {totalLate}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Exceeded shift grace period
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
          <div className="text-xs font-bold uppercase text-slate-400">
            Mode C Off-Site Time Outs
          </div>
          <div className="mt-1 text-3xl font-black text-amber-400">
            {totalOffsiteModeC}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Authorized field / errand staff
          </div>
        </div>
      </div>

      {/* Sub-Navigation Pills */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab("timecards")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            activeSubTab === "timecards"
              ? "bg-sky-600 text-white shadow"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Camera className="h-4 w-4" />
          <span>Digital Time Cards & Selfies ({filteredLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("employees")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            activeSubTab === "employees"
              ? "bg-sky-600 text-white shadow"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>
            Branch Staff & Mode C Permissions ({filteredEmployees.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("shifts")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            activeSubTab === "shifts"
              ? "bg-sky-600 text-white shadow"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <CalendarClock className="h-4 w-4" />
          <span>Shift Templates ({filteredShifts.length})</span>
        </button>
      </div>

      {/* TAB 1: DIGITAL TIME CARDS & SELFIE VERIFICATION */}
      {activeSubTab === "timecards" && (
        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center text-slate-400">
              No attendance logs recorded for this branch filter yet.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="grid gap-5 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg lg:grid-cols-12"
              >
                {/* Employee & Shift Details */}
                <div className="space-y-2 lg:col-span-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-sky-500/20 px-2.5 py-0.5 font-mono text-xs font-bold text-sky-300">
                      {log.employeeCode}
                    </span>
                    <span className="rounded-md bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                      {log.shiftName} ({formatTime12h(log.shiftStart)} –{" "}
                      {formatTime12h(log.shiftEnd)})
                    </span>
                    {log.lateMinutes > 0 ? (
                      <span className="rounded-md bg-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-300 border border-rose-500/30">
                        LATE: {log.lateMinutes} mins
                      </span>
                    ) : (
                      <span className="rounded-md bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                        ON TIME
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-extrabold text-white">
                    {log.employeeName}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400">
                    📍 {log.branchName} • Date: {log.dateKey}
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <div className="font-bold text-emerald-400">
                        TIME IN (Vicinity Verified)
                      </div>
                      <div className="mt-1 font-mono text-sm font-bold text-white">
                        {new Date(log.timeInAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="mt-0.5 text-slate-400">
                        Distance: {log.timeInDistanceM}m from store
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <div className="font-bold text-sky-400">
                        TIME OUT{" "}
                        {log.isOffsiteTimeout ? "(Mode C Off-Site)" : ""}
                      </div>
                      <div className="mt-1 font-mono text-sm font-bold text-white">
                        {log.timeOutAt
                          ? new Date(log.timeOutAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Active Shift"}
                      </div>
                      <div className="mt-0.5 text-slate-400">
                        {log.timeOutAt
                          ? `Distance: ${log.timeOutDistanceM}m • ${log.totalHours} hrs`
                          : "Has not timed out yet"}
                      </div>
                    </div>
                  </div>

                  {log.isOffsiteTimeout && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
                      <strong>Mode C Authorized Off-Site Time Out:</strong>{" "}
                      {log.offsiteNote || "Logged outside branch geofence."}
                    </div>
                  )}
                </div>

                {/* Side-by-Side Watermarked Camera Selfies */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-emerald-400">
                      <span>TIME-IN CAMERA SELFIE</span>
                      <span>{log.timeInDistanceM}m from branch</span>
                    </div>
                    <img
                      src={log.timeInPhotoData}
                      alt={`${log.employeeName} Time In`}
                      className="h-44 w-full rounded-xl border border-slate-700 object-cover"
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-sky-400">
                      <span>TIME-OUT CAMERA SELFIE</span>
                      <span>
                        {log.timeOutAt
                          ? `${log.timeOutDistanceM}m (${
                              log.isOffsiteTimeout ? "Mode C Remote" : "In-Store"
                            })`
                          : "Pending"}
                      </span>
                    </div>
                    {log.timeOutPhotoData ? (
                      <img
                        src={log.timeOutPhotoData}
                        alt={`${log.employeeName} Time Out`}
                        className="h-44 w-full rounded-xl border border-slate-700 object-cover"
                      />
                    ) : (
                      <div className="flex h-44 w-full items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950 text-xs text-slate-500">
                        Employee currently clocked in
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: EMPLOYEE ROSTER & MODE C OFF-SITE TOGGLE */}
      {activeSubTab === "employees" && (
        <div className="space-y-6">
          {/* Add New Employee Form */}
          <form
            onSubmit={handleCreateEmployee}
            className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg"
          >
            <h3 className="flex items-center gap-2 text-base font-extrabold text-white">
              <Plus className="h-5 w-5 text-emerald-400" />
              <span>Add Employee to Roster</span>
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-bold text-slate-300">
                  Employee Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., JT-107"
                  value={empCode}
                  onChange={(e) => setEmpCode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300">
                  Full Name & Position
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Lorna Tolentino (Cashier)"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              {isSysAd && (
                <div>
                  <label className="block text-xs font-bold text-slate-300">
                    Assigned Branch & Role
                  </label>
                  <div className="mt-1 flex gap-2">
                    <select
                      value={empBranchId}
                      onChange={(e) => setEmpBranchId(e.target.value)}
                      className="w-2/3 rounded-xl border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={empRole}
                      onChange={(e) => setEmpRole(e.target.value as AccessRole)}
                      className="w-1/3 rounded-xl border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="SYSAD">SYSAD</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300">
                  Shift Template
                </label>
                <select
                  value={empShiftId}
                  onChange={(e) => setEmpShiftId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  {shifts
                    .filter((s) =>
                      isSysAd
                        ? s.branchId === empBranchId
                        : s.branchId === currentUser.branchId
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatTime12h(s.startTime)} -{" "}
                        {formatTime12h(s.endTime)})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4">
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={empOffsite}
                    onChange={(e) => setEmpOffsite(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600"
                  />
                  <span>
                    Mode C: Authorize Off-Site Time Out (Field / Delivery /
                    Errand Staff)
                  </span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-sky-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={empMultiBranch}
                    onChange={(e) => setEmpMultiBranch(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600"
                  />
                  <span>Allow Multi-Branch Reliever Time-In</span>
                </label>
              </div>

              <button
                type="submit"
                className="rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-500"
              >
                + Register Employee
              </button>
            </div>
          </form>

          {/* Employee Table with Mode C Toggles & Shift Assignment */}
          <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-lg">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">Code & Name</th>
                  <th className="px-4 py-3.5">Access Level</th>
                  <th className="px-4 py-3.5">Branch</th>
                  <th className="px-4 py-3.5">Assigned Shift Template</th>
                  <th className="px-4 py-3.5">
                    Mode C: Off-Site Time Out Policy
                  </th>
                  <th className="px-4 py-3.5">Multi-Branch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredEmployees.map((emp) => {
                  const empBranch = branches.find((b) => b.id === emp.branchId);
                  const branchShifts = shifts.filter(
                    (s) => s.branchId === emp.branchId
                  );
                  return (
                    <tr key={emp.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-bold text-sky-400">
                          {emp.employeeCode}
                        </div>
                        <div className="font-bold text-white">
                          {emp.fullName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                            emp.role === "SYSAD"
                              ? "bg-purple-500/20 text-purple-300"
                              : emp.role === "ADMIN"
                              ? "bg-indigo-500/20 text-indigo-300"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {empBranch?.name}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={emp.shiftId}
                          onChange={(e) =>
                            onChangeEmployeeShift(emp.id, e.target.value)
                          }
                          className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white"
                        >
                          {branchShifts.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({formatTime12h(s.startTime)}–
                              {formatTime12h(s.endTime)})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onToggleEmployeeOffsiteModeC(emp.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                            emp.allowOffsiteTimeout
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                              : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                          }`}
                        >
                          {emp.allowOffsiteTimeout
                            ? "✓ Allowed Off-Site (Errand/Field)"
                            : "Strict In-Store Only"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onToggleEmployeeMultiBranch(emp.id)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                            emp.allowMultiBranch
                              ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {emp.allowMultiBranch ? "Floater (3 Stores)" : "1 Store"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BRANCH SHIFT TEMPLATES (OPENING, MID, CLOSING) */}
      {activeSubTab === "shifts" && (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateShift}
            className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg"
          >
            <h3 className="text-base font-extrabold text-white">
              + Create New Branch Shift Template
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-5">
              {isSysAd && (
                <div>
                  <label className="block text-xs font-bold text-slate-300">
                    Branch
                  </label>
                  <select
                    value={shiftBranchId}
                    onChange={(e) => setShiftBranchId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-300">
                  Shift Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Graveyard / Split"
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300">
                  Start Time
                </label>
                <input
                  type="time"
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300">
                  End Time
                </label>
                <input
                  type="time"
                  value={shiftEnd}
                  onChange={(e) => setShiftEnd(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-300">
                    Grace (Mins)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={shiftGrace}
                    onChange={(e) => setShiftGrace(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500"
                >
                  Save
                </button>
              </div>
            </div>
          </form>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredShifts.map((shift) => {
              const bName = branches.find((b) => b.id === shift.branchId)?.name;
              return (
                <div
                  key={shift.id}
                  className="rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow"
                >
                  <div className="text-xs font-bold text-sky-400">{bName}</div>
                  <h4 className="mt-1 text-lg font-extrabold text-white">
                    {shift.name}
                  </h4>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="block text-slate-400">Start</span>
                      <input
                        type="time"
                        value={shift.startTime}
                        onChange={(e) =>
                          onUpdateShiftTemplate({
                            ...shift,
                            startTime: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-white"
                      />
                    </div>
                    <div>
                      <span className="block text-slate-400">End</span>
                      <input
                        type="time"
                        value={shift.endTime}
                        onChange={(e) =>
                          onUpdateShiftTemplate({
                            ...shift,
                            endTime: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-white"
                      />
                    </div>
                    <div>
                      <span className="block text-slate-400">Grace (m)</span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={shift.gracePeriodMins}
                        onChange={(e) =>
                          onUpdateShiftTemplate({
                            ...shift,
                            gracePeriodMins: Number(e.target.value) || 0,
                          })
                        }
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-white"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
