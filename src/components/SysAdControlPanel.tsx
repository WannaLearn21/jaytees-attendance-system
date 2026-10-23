"use client";

import React from "react";
import {
  AttendanceLog,
  Branch,
  Employee,
  GpsPosition,
  ShiftTemplate,
} from "@/types/attendance";
import {
  Building2,
  Database,
  HardDrive,
  MapPin,
  RefreshCcw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
} from "lucide-react";

interface SysAdControlPanelProps {
  branches: Branch[];
  employees: Employee[];
  shifts: ShiftTemplate[];
  logs: AttendanceLog[];
  currentGps: GpsPosition;
  onUpdateBranch: (updatedBranch: Branch) => void;
  onGenerate100Employees: () => void;
  onResetDemoData: () => void;
}

export function SysAdControlPanel({
  branches,
  employees,
  logs,
  currentGps,
  onUpdateBranch,
  onGenerate100Employees,
  onResetDemoData,
}: SysAdControlPanelProps) {
  // Estimate free-tier cloud consumption
  const estimatedDbKb = Math.round(
    (employees.length * 0.6 + logs.length * 1.2) * 10
  ) / 10;
  const estimatedPhotoKb = logs.reduce((acc, log) => {
    const inSize = log.timeInPhotoData ? 36 : 0;
    const outSize = log.timeOutPhotoData ? 36 : 0;
    return acc + inSize + outSize;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top SysAd Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-purple-500/40 bg-slate-900 p-5 shadow-xl sm:flex-row sm:items-center">
        <div>
          <span className="rounded-md bg-purple-500/20 px-2.5 py-0.5 text-xs font-bold text-purple-300 border border-purple-500/30">
            Level 1: System Administrator (SysAd) Exclusive Control
          </span>
          <h2 className="mt-1 text-2xl font-extrabold text-white">
            3-Branch Geofence & Cloud Infrastructure Configurator
          </h2>
          <p className="text-xs text-slate-400">
            Configure branch GPS coordinates, allowed Time-In radius, and
            monitor $0 Free-Tier storage capacity for ~100 employees.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onGenerate100Employees}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-purple-500"
          >
            <Users className="h-4 w-4" />
            <span>Populate Full 100-Employee Roster</span>
          </button>

          <button
            type="button"
            onClick={onResetDemoData}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* 3 Branches Geofence Cards */}
      <div className="grid gap-5 lg:grid-cols-3">
        {branches.map((branch, idx) => {
          const branchStaffCount = employees.filter(
            (e) => e.branchId === branch.id
          ).length;
          const branchLogCount = logs.filter(
            (l) => l.branchId === branch.id
          ).length;

          return (
            <div
              key={branch.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-sky-500/20 px-2.5 py-1 font-mono text-xs font-bold text-sky-300">
                    BRANCH #{idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {branchStaffCount} Staff • {branchLogCount} Logs Today
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={branch.name}
                    onChange={(e) =>
                      onUpdateBranch({ ...branch, name: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400">
                    Store Address
                  </label>
                  <input
                    type="text"
                    value={branch.address}
                    onChange={(e) =>
                      onUpdateBranch({ ...branch, address: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={branch.latitude}
                      onChange={(e) =>
                        onUpdateBranch({
                          ...branch,
                          latitude: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={branch.longitude}
                      onChange={(e) =>
                        onUpdateBranch({
                          ...branch,
                          longitude: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
                    />
                  </div>
                </div>

                {/* Geofence Vicinity Radius Slider */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300">
                      Allowed Geofence Radius:
                    </span>
                    <span className="font-mono text-sm text-emerald-400">
                      {branch.radiusMeters} meters
                    </span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={250}
                    step={5}
                    value={branch.radiusMeters}
                    onChange={(e) =>
                      onUpdateBranch({
                        ...branch,
                        radiusMeters: Number(e.target.value),
                      })
                    }
                    className="mt-2 w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>30m (Strict)</span>
                    <span>80m (Recommended)</span>
                    <span>250m (Wide Mall)</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onUpdateBranch({
                    ...branch,
                    latitude: Number(currentGps.latitude.toFixed(5)),
                    longitude: Number(currentGps.longitude.toFixed(5)),
                  })
                }
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-300 hover:bg-sky-500/20"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Calibrate Store to Current GPS</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* $0 Budget / Free-Tier Capacity Monitor */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <div className="flex items-center gap-2 text-emerald-400">
          <HardDrive className="h-5 w-5" />
          <h3 className="text-lg font-extrabold text-white">
            $0/Month Free-Tier Infrastructure Monitor (100 Employees Scale)
          </h3>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Real-time tracking of database rows and WebP-compressed selfie usage
          against free cloud quotas.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs font-bold uppercase text-slate-400">
              Active Staff Roster
            </div>
            <div className="mt-1 text-2xl font-black text-white">
              {employees.length} / 100+ Staff
            </div>
            <p className="mt-1 text-xs text-emerald-400">
              Supabase Auth Free Limit: 50,000 Monthly Active Users
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs font-bold uppercase text-slate-400">
              PostgreSQL Database Size
            </div>
            <div className="mt-1 text-2xl font-black text-sky-400">
              {estimatedDbKb} KB / 500,000 KB
            </div>
            <p className="mt-1 text-xs text-slate-400">
              100 staff × 26 days = ~15 MB/year (0.01% of 500 MB Free Tier)
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs font-bold uppercase text-slate-400">
              Compressed Selfie Storage
            </div>
            <div className="mt-1 text-2xl font-black text-amber-400">
              {(estimatedPhotoKb / 1024).toFixed(2)} MB / 1,000 MB Free
            </div>
            <p className="mt-1 text-xs text-slate-400">
              WebP compression (~35KB/photo) keeps storage 100% free
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
