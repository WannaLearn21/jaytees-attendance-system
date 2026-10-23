"use client";

import React, { useState } from "react";
import { Branch, Employee } from "@/types/attendance";

interface PilotAuditViewProps {
  branches: Branch[];
  employees: Employee[];
}

interface ParallelComparisonEntry {
  id: string;
  employeeCode: string;
  employeeName: string;
  dateStr: string;
  shiftName: string;
  paperTimeIn: string;
  digitalTimeIn: string;
  inVarianceMins: number;
  paperTimeOut: string;
  digitalTimeOut: string;
  outVarianceMins: number;
  status: "EXACT_MATCH" | "WITHIN_TOLERANCE" | "VARIANCE_FLAGGED";
  notes?: string;
}

const INITIAL_PILOT_LOGS: ParallelComparisonEntry[] = [
  {
    id: "comp-1",
    employeeCode: "EMP-6502",
    employeeName: "Mang Benigno Ramos",
    dateStr: "2024-10-14",
    shiftName: "Opening",
    paperTimeIn: "06:58 AM",
    digitalTimeIn: "06:57 AM",
    inVarianceMins: 1,
    paperTimeOut: "03:00 PM",
    digitalTimeOut: "03:02 PM",
    outVarianceMins: 2,
    status: "WITHIN_TOLERANCE",
    notes: "Unassisted punch; outdoor Tagaytay fog signal acquired in 2.8s",
  },
  {
    id: "comp-2",
    employeeCode: "EMP-4319",
    employeeName: "Liza Dela Cruz",
    dateStr: "2024-10-14",
    shiftName: "Opening",
    paperTimeIn: "07:00 AM",
    digitalTimeIn: "07:00 AM",
    inVarianceMins: 0,
    paperTimeOut: "03:05 PM",
    digitalTimeOut: "03:05 PM",
    outVarianceMins: 0,
    status: "EXACT_MATCH",
    notes: "Exact second-level match between mechanical timecard and JATS",
  },
  {
    id: "comp-3",
    employeeCode: "EMP-8821",
    employeeName: "Marco Santos",
    dateStr: "2024-10-14",
    shiftName: "Mid Shift",
    paperTimeIn: "09:55 AM",
    digitalTimeIn: "09:56 AM",
    inVarianceMins: 1,
    paperTimeOut: "07:00 PM",
    digitalTimeOut: "06:58 PM",
    outVarianceMins: 2,
    status: "WITHIN_TOLERANCE",
    notes: "Mode C remote punch at Mahogany Beef Market verified",
  },
  {
    id: "comp-4",
    employeeCode: "ID-4109",
    employeeName: "Mark Jason Alcantara",
    dateStr: "2024-10-14",
    shiftName: "Opening",
    paperTimeIn: "06:55 AM",
    digitalTimeIn: "06:56 AM",
    inVarianceMins: 1,
    paperTimeOut: "03:00 PM",
    digitalTimeOut: "03:00 PM",
    outVarianceMins: 0,
    status: "WITHIN_TOLERANCE",
    notes: "Punched at Main Entrance kiosk beacon",
  },
  {
    id: "comp-5",
    employeeCode: "EMP-6502",
    employeeName: "Mang Benigno Ramos",
    dateStr: "2024-10-15",
    shiftName: "Opening",
    paperTimeIn: "06:55 AM",
    digitalTimeIn: "06:55 AM",
    inVarianceMins: 0,
    paperTimeOut: "03:00 PM",
    digitalTimeOut: "03:01 PM",
    outVarianceMins: 1,
    status: "EXACT_MATCH",
    notes: "Fast 8-second total interaction time from lockscreen to punch",
  },
];

export function PilotAuditView({ branches, employees }: PilotAuditViewProps) {
  const [pilotLogs, setPilotLogs] = useState<ParallelComparisonEntry[]>(
    INITIAL_PILOT_LOGS
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [cutoverAuthorized, setCutoverAuthorized] = useState(false);
  const [cutoverToast, setCutoverToast] = useState<string | null>(null);

  // New comparison form state
  const [newEmpId, setNewEmpId] = useState(employees[0]?.id || "");
  const [newPaperIn, setNewPaperIn] = useState("07:00 AM");
  const [newDigitalIn, setNewDigitalIn] = useState("07:01 AM");
  const [newPaperOut, setNewPaperOut] = useState("03:00 PM");
  const [newDigitalOut, setNewDigitalOut] = useState("03:00 PM");
  const [newNotes, setNewNotes] = useState("");

  const maharlikaBranch = branches[0] || {
    name: "Jaytees Tagaytay Maharlika (Main Branch)",
    radiusMeters: 150,
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === newEmpId) || employees[0];
    const newEntry: ParallelComparisonEntry = {
      id: `comp-${Date.now()}`,
      employeeCode: emp.employeeCode,
      employeeName: emp.fullName,
      dateStr: new Date().toISOString().slice(0, 10),
      shiftName: "Opening",
      paperTimeIn: newPaperIn,
      digitalTimeIn: newDigitalIn,
      inVarianceMins: 1,
      paperTimeOut: newPaperOut,
      digitalTimeOut: newDigitalOut,
      outVarianceMins: 0,
      status: "WITHIN_TOLERANCE",
      notes: newNotes || "Pilot field observation verified",
    };
    setPilotLogs((prev) => [newEntry, ...prev]);
    setShowAddModal(false);
  };

  const handleAuthorizeCutover = () => {
    setCutoverAuthorized(true);
    setCutoverToast(
      "Cutover Authorized: Pilot at Jaytees Tagaytay Maharlika passed all criteria. Physical paper timecards decommissioned. Phased rollout granted for Jaytees Rotunda & Jaytees Perfect View (9th Branch)."
    );
    setTimeout(() => setCutoverToast(null), 6000);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-[#1B1B1A] tracking-tight">
            Pilot & Rollout · {maharlikaBranch.name}
          </h1>
          <p className="text-sm text-[#4A4A47] mt-0.5">
            Phase 7 Verification: 14-Day Paper Timecard vs. JATS Digital Dual Tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="h-10 px-4 bg-white border border-[#6B6B67] rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Record Paper Card Check</span>
          </button>

          <button
            type="button"
            onClick={handleAuthorizeCutover}
            disabled={cutoverAuthorized}
            className={`h-10 px-5 rounded-lg text-sm font-bold transition-all shadow-xs flex items-center gap-1.5 ${
              cutoverAuthorized
                ? "bg-emerald-600 text-white cursor-default"
                : "bg-[#1B1B1A] text-white hover:bg-black"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {cutoverAuthorized ? "task_alt" : "verified"}
            </span>
            <span>
              {cutoverAuthorized ? "Cutover Approved" : "Authorize 3-Branch Cutover"}
            </span>
          </button>
        </div>
      </div>

      {cutoverToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-sm font-medium flex items-center gap-3 shadow-xs">
          <span className="material-symbols-outlined text-emerald-600 text-[24px]">
            check_circle
          </span>
          <span className="leading-relaxed">{cutoverToast}</span>
        </div>
      )}

      {/* 4 Metric Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#C9C9C4] rounded-xl p-4 shadow-xs">
          <div className="text-[14px] text-[#4A4A47] font-medium">Pilot Cohort</div>
          <div className="text-[32px] font-extrabold text-[#1B1B1A] leading-tight mt-1">
            10 Staff
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Maharlika Baristas & Kitchen
          </div>
        </div>

        <div className="bg-white border border-[#C9C9C4] rounded-xl p-4 shadow-xs">
          <div className="text-[14px] text-[#4A4A47] font-medium">Parallel Run</div>
          <div className="text-[32px] font-extrabold text-[#1B1B1A] leading-tight mt-1">
            14 / 14 Days
          </div>
          <div className="text-xs text-slate-500 mt-1">
            1 Full Pay Period Completed
          </div>
        </div>

        <div className="bg-white border border-[#C9C9C4] rounded-xl p-4 shadow-xs">
          <div className="text-[14px] text-[#4A4A47] font-medium">Average Variance</div>
          <div className="text-[32px] font-extrabold text-emerald-700 leading-tight mt-1">
            ± 0.8 min
          </div>
          <div className="text-xs text-emerald-600 font-semibold mt-1">
            Goal: &lt; 3.0 min tolerance (PASSED)
          </div>
        </div>

        <div className="bg-white border border-[#C9C9C4] rounded-xl p-4 shadow-xs">
          <div className="text-[14px] text-[#4A4A47] font-medium">Tolerance Pass Rate</div>
          <div className="text-[32px] font-extrabold text-[#1B1B1A] leading-tight mt-1">
            99.2%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            0 Fraudulent or Ghost Punches
          </div>
        </div>
      </div>

      {/* Side-by-Side Dual Tracking Table (Card 7.1) */}
      <div className="bg-white border border-[#C9C9C4] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#C9C9C4] flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="font-bold text-[16px] text-[#1B1B1A]">
              Parallel Audit: Paper Timecard vs. JATS Digital Punches
            </div>
            <div className="text-xs text-[#4A4A47]">
              Comparing physical mechanical punch-clock timestamps against JATS server timestamps (3-minute tolerance boundary)
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
            TOLERANCE: ≤ 3 MIN
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[15px]">
            <thead>
              <tr className="border-b border-[#C9C9C4] text-left bg-slate-50/60">
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Employee
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Date
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Paper In vs. Digital In
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Paper Out vs. Digital Out
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Audit Status
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Field Observation Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E3DF]">
              {pilotLogs.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-semibold text-[#1B1B1A]">
                    <div>{item.employeeName}</div>
                    <div className="text-xs font-mono text-slate-500 font-normal">
                      {item.employeeCode}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-700">
                    {item.dateStr}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-mono text-slate-800">
                      Paper: <span className="font-bold">{item.paperTimeIn}</span>
                    </div>
                    <div className="text-xs font-mono text-slate-600">
                      JATS: {item.digitalTimeIn} (Δ {item.inVarianceMins}m)
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-mono text-slate-800">
                      Paper: <span className="font-bold">{item.paperTimeOut}</span>
                    </div>
                    <div className="text-xs font-mono text-slate-600">
                      JATS: {item.digitalTimeOut} (Δ {item.outVarianceMins}m)
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {item.status === "EXACT_MATCH" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        <span className="material-symbols-outlined text-[14px]">
                          check_circle
                        </span>
                        Exact Match
                      </span>
                    ) : item.status === "WITHIN_TOLERANCE" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
                        <span className="material-symbols-outlined text-[14px]">
                          verified
                        </span>
                        ± {Math.max(item.inVarianceMins, item.outVarianceMins)}m OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded border border-red-300">
                        Flagged
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 max-w-xs leading-relaxed">
                    {item.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2-Column Section: Tagaytay GPS Drift Calibration (Card 7.2) + Senior Usability Sign-Off (Card 7.3) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 7.2: Tagaytay Geofence & GPS Accuracy Tuning */}
        <div className="bg-white border border-[#C9C9C4] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-amber-600">
                  radar
                </span>
                <h3 className="font-bold text-[16px] text-[#1B1B1A]">
                  Card 7.2: Tagaytay Ridge GPS & Geofence Calibration
                </h3>
              </div>
              <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                Calibrated
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Tagaytay's high elevation (~600m), morning mountain fog, and the restaurant’s corrugated metal roofing induce predictable indoor GPS multipath drift.
            </p>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#1B1B1A]">
                    Maharlika Main Branch Geofence
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Tuned from 100m to 150m to encompass kitchen & back parking
                  </div>
                </div>
                <span className="font-mono font-bold text-sm text-[#1B1B1A]">
                  150 meters
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#1B1B1A]">
                    Hardware GPS Accuracy Filter
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Tolerates up to 50m accuracy error during heavy ridge fog
                  </div>
                </div>
                <span className="font-mono font-bold text-sm text-[#1B1B1A]">
                  ≤ 50 meters
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#1B1B1A]">
                    Wi-Fi SSID Fallback Anchor
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Binds to Jaytees_Maharlika_5G when GPS is temporarily shaded
                  </div>
                </div>
                <span className="font-mono font-bold text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  BOUND
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">
              check
            </span>
            <span>Zero legitimate punches rejected due to GPS drift during 14-day trial.</span>
          </div>
        </div>

        {/* Card 7.3: Senior Usability Audit */}
        <div className="bg-white border border-[#C9C9C4] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-purple-600">
                  elderly
                </span>
                <h3 className="font-bold text-[16px] text-[#1B1B1A]">
                  Card 7.3: Senior Usability & Coaching-Free Sign-Off
                </h3>
              </div>
              <span className="text-xs font-mono font-bold bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                100% Passed
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Tested with senior employees including Mang Benigno Ramos (Age 58, Senior Barista) and kitchen elder leads on low-end Android phones without supervisor coaching.
            </p>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5">
                  check_box
                </span>
                <div>
                  <strong>64px Minimum Button Tap Target:</strong> Large touch target eliminates mis-taps, even when wearing kitchen rubber gloves.
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5">
                  check_box
                </span>
                <div>
                  <strong>18px+ Body Font & High Contrast:</strong> Clear readability in bright morning Tagaytay sun and low-light kitchen prep stations.
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5">
                  check_box
                </span>
                <div>
                  <strong>One Primary Action Per Screen:</strong> Eliminates cognitive overload; the user is greeted by name, checks camera, and taps one large button.
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5">
                  check_box
                </span>
                <div>
                  <strong>Plain-Language Error Text:</strong> Friendly messages with clear physical guidance (e.g., <em>"Nasa labas ka pa ng tindahan. Lumapit sa branch..."</em>).
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-purple-600">
              sentiment_satisfied
            </span>
            <span>Mang Benigno completed unassisted Time-In in 9.2 seconds average.</span>
          </div>
        </div>
      </div>

      {/* Card 7.4: 3-Branch Rollout Gate (Retiring Paper Cards) */}
      <div className="bg-white border border-[#C9C9C4] rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 mb-4 gap-2">
          <div>
            <h3 className="font-bold text-[18px] text-[#1B1B1A]">
              Card 7.4: Multi-Branch Rollout & Paper Card Decommissioning Plan
            </h3>
            <p className="text-xs text-[#4A4A47] mt-0.5">
              Phased transition sequence across all 3 Jaytees branches
            </p>
          </div>
          <span className="font-mono text-xs font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-700">
            TOTAL HEADCOUNT: ~100 STAFF
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Branch 1 */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase text-emerald-800">
                  Branch 1: Main Flagship
                </span>
                <span className="text-[10px] font-mono font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                  PILOT PASSED
                </span>
              </div>
              <div className="font-bold text-sm text-slate-900">
                Jaytees Tagaytay Maharlika
              </div>
              <div className="text-xs text-slate-600 mt-1">
                44 Staff • Geofence: 150m • Mode C Active
              </div>
            </div>
            <div className="mt-3 text-xs font-bold text-emerald-700">
              Paper time cards decommissioned. 100% digital.
            </div>
          </div>

          {/* Branch 2 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase text-slate-700">
                  Branch 2: Junction
                </span>
                <span className="text-[10px] font-mono font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  NEXT CUTOVER
                </span>
              </div>
              <div className="font-bold text-sm text-slate-900">
                Jaytees Rotunda
              </div>
              <div className="text-xs text-slate-600 mt-1">
                32 Staff • Geofence: 120m • Tagaytay Silang Crossing
              </div>
            </div>
            <div className="mt-3 text-xs font-medium text-slate-600">
              Kiosk tablet positioned at staff entrance; cutover scheduled.
            </div>
          </div>

          {/* Branch 3 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase text-slate-700">
                  Branch 3: Scenic Ridge
                </span>
                <span className="text-[10px] font-mono font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full">
                  9TH BRANCH
                </span>
              </div>
              <div className="font-bold text-sm text-slate-900">
                Jaytees Perfect View (9th Branch)
              </div>
              <div className="text-xs text-slate-600 mt-1">
                28 Staff • Geofence: 180m • Laurel / Twin Lakes Ridge
              </div>
            </div>
            <div className="mt-3 text-xs font-medium text-slate-600">
              Al fresco dining perimeter tuned; cellular Wi-Fi verified.
            </div>
          </div>
        </div>
      </div>

      {/* Record Paper Card Check Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-[#1B1B1A]">
                Record Paper Card Comparison
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddLog} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Employee
                </label>
                <select
                  value={newEmpId}
                  onChange={(e) => setNewEmpId(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Paper Time In
                  </label>
                  <input
                    type="text"
                    value={newPaperIn}
                    onChange={(e) => setNewPaperIn(e.target.value)}
                    required
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Digital JATS In
                  </label>
                  <input
                    type="text"
                    value={newDigitalIn}
                    onChange={(e) => setNewDigitalIn(e.target.value)}
                    required
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Paper Time Out
                  </label>
                  <input
                    type="text"
                    value={newPaperOut}
                    onChange={(e) => setNewPaperOut(e.target.value)}
                    required
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Digital JATS Out
                  </label>
                  <input
                    type="text"
                    value={newDigitalOut}
                    onChange={(e) => setNewDigitalOut(e.target.value)}
                    required
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Field Observations
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Unassisted punch, good lighting fix"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-10 px-4 rounded-lg border border-slate-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-lg bg-[#1B1B1A] text-white text-sm font-bold shadow-xs hover:bg-black"
                >
                  Save Check
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
