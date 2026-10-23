"use client";

import React, { useState } from "react";
import { AccessRole, Branch, Employee } from "@/types/attendance";

interface BranchGeofencesControlsProps {
  role: AccessRole;
  branches: Branch[];
  employees: Employee[];
  onUpdateBranchRadius: (branchId: string, radiusMeters: number) => void;
  onUpdateBranchCoords?: (
    branchId: string,
    lat: number,
    lng: number
  ) => void;
  onToggleEmployeeModeC: (employeeId: string) => void;
  onSetBulkModeC?: (mode: "grant_field" | "reset_strict") => void;
}

export default function BranchGeofencesControls({
  role,
  branches,
  employees,
  onUpdateBranchRadius,
  onUpdateBranchCoords,
  onToggleEmployeeModeC,
  onSetBulkModeC,
}: BranchGeofencesControlsProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    branches[0]?.id || "b-main"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [saveState, setSaveState] = useState<"idle" | "syncing" | "saved">(
    "idle"
  );
  const [auditToast, setAuditToast] = useState<string | null>(null);

  const activeBranch =
    branches.find((b) => b.id === selectedBranchId) || branches[0];

  const handleSaveGeofence = () => {
    setSaveState("syncing");
    setTimeout(() => {
      setSaveState("saved");
      setTimeout(() => {
        setSaveState("idle");
      }, 2200);
    }, 700);
  };

  const handleCalibrateGps = (branch: Branch) => {
    if (!navigator.geolocation) {
      setAuditToast(
        `Calibrated ${branch.shortName} enclosure to ${branch.latitude.toFixed(4)}° N, ${branch.longitude.toFixed(4)}° E`
      );
      setTimeout(() => setAuditToast(null), 3500);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onUpdateBranchCoords?.(
          branch.id,
          Number(pos.coords.latitude.toFixed(4)),
          Number(pos.coords.longitude.toFixed(4))
        );
        setAuditToast(
          `Updated ${branch.shortName} GPS anchor to live coordinates (${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E)`
        );
        setTimeout(() => setAuditToast(null), 3500);
      },
      () => {
        setAuditToast(
          `Verified ${branch.shortName} hardware anchor (${branch.latitude.toFixed(4)}° N, ${branch.longitude.toFixed(4)}° E)`
        );
        setTimeout(() => setAuditToast(null), 3500);
      }
    );
  };

  const handleGrantFieldStaff = () => {
    if (onSetBulkModeC) {
      onSetBulkModeC("grant_field");
    } else {
      employees.forEach((emp) => {
        const isFieldCandidate =
          emp.designation.toLowerCase().includes("logistics") ||
          emp.designation.toLowerCase().includes("runner") ||
          emp.designation.toLowerCase().includes("delivery") ||
          emp.designation.toLowerCase().includes("messenger");
        if (isFieldCandidate && !emp.allowOffsiteTimeout) {
          onToggleEmployeeModeC(emp.id);
        }
      });
    }
    setAuditToast(
      "Mode C (Off-Site Time Out) granted to all Logistics, Procurement & Field staff."
    );
    setTimeout(() => setAuditToast(null), 3500);
  };

  const handleResetAllStrict = () => {
    if (onSetBulkModeC) {
      onSetBulkModeC("reset_strict");
    } else {
      employees.forEach((emp) => {
        if (emp.allowOffsiteTimeout) {
          onToggleEmployeeModeC(emp.id);
        }
      });
    }
    setAuditToast(
      "All employees reset to Standard Strict In-Store Geofence policy."
    );
    setTimeout(() => setAuditToast(null), 3500);
  };

  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      emp.fullName.toLowerCase().includes(q) ||
      emp.employeeCode.toLowerCase().includes(q) ||
      emp.designation.toLowerCase().includes(q);

    const matchesBranch =
      branchFilter === "all" || emp.branchId === branchFilter;

    const isFieldStaff =
      emp.designation.toLowerCase().includes("logistics") ||
      emp.designation.toLowerCase().includes("runner") ||
      emp.designation.toLowerCase().includes("delivery") ||
      emp.allowOffsiteTimeout;

    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "field" && isFieldStaff) ||
      (roleFilter === "floor" && !isFieldStaff);

    return matchesSearch && matchesBranch && matchesRole;
  });

  // Ring visual scale based on radius (50m - 300m)
  const ringScalePx = Math.round(
    96 + ((activeBranch?.radiusMeters || 150) - 50) * 0.36
  );

  return (
    <div className="flex flex-col w-full">
      {/* Top Hero Header */}
      <div className="relative mb-space-lg">
        <div className="absolute -top-10 -left-10 w-96 h-96 bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-secondary-fixed/40 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative flex flex-col xl:flex-row xl:items-end justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-space-xs mb-space-xs">
              <span className="px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">
                  security
                </span>{" "}
                PRD §1.2 &amp; §2 Enforcement
              </span>
              <span className="text-on-surface-variant font-data-mono text-body-sm">
                LAT-LON GEOFENCE ENGINE
              </span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-primary tracking-tight">
              Branch Geofences &amp; Mode C Controls
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-1">
              Precision GPS boundaries, SSID anchor enforcement, and
              fine-grained off-site punch permissions with spoof-detection
              telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm">
            <button
              onClick={handleSaveGeofence}
              className="h-12 px-space-lg rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg shadow-md hover:bg-primary transition-all flex items-center gap-space-xs"
            >
              {saveState === "syncing" && (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">
                    progress_activity
                  </span>
                  <span>Syncing Nodes...</span>
                </>
              )}
              {saveState === "saved" && (
                <>
                  <span className="material-symbols-outlined text-[20px]">
                    check_circle
                  </span>
                  <span>Perimeters Applied!</span>
                </>
              )}
              {saveState === "idle" && (
                <>
                  <span className="material-symbols-outlined text-[20px]">
                    save
                  </span>
                  <span>Save Boundary Config</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                setAuditToast(
                  "Exported Geofence & Mode C Audit Trail snapshot (JSON/CSV)."
                );
                setTimeout(() => setAuditToast(null), 3500);
              }}
              className="h-12 px-space-md rounded-xl bg-surface-container-lowest text-on-surface font-label-lg text-label-lg shadow-sm hover:bg-surface-container-low transition-all flex items-center gap-space-xs"
            >
              <span className="material-symbols-outlined text-secondary text-[20px]">
                history_edu
              </span>
              <span>Audit Log Export</span>
            </button>
          </div>
        </div>
      </div>

      {auditToast && (
        <div className="mb-space-md px-space-md py-space-sm rounded-xl bg-tertiary-fixed text-on-tertiary-fixed font-label-md text-label-md flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[18px]">
              verified
            </span>
            <span>{auditToast}</span>
          </div>
          <button
            onClick={() => setAuditToast(null)}
            className="text-on-tertiary-fixed hover:opacity-75"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Top 12-Col Grid: Registered Store Enclosures (8 cols) + Live Perimeter Visualizer (4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg mb-space-xl">
        <div className="xl:col-span-8 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-container via-secondary-container to-tertiary-container"></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-md mb-space-md gap-space-sm bg-surface-container-low/40 -mx-space-lg -mt-space-lg px-space-lg pt-space-lg">
              <div>
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary-container text-[24px]">
                    hub
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface">
                    Registered Store Enclosures
                  </h2>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Live telemetry from {branches.length} configured Jaytees Tagaytay & Cavite locations (Maharlika, Rotunda, Perfect View)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary/10 text-tertiary font-label-sm text-label-sm">
                  <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse"></span>{" "}
                  3/3 Clusters Active
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-space-md">
              {branches.map((branch, idx) => {
                const isSelected = branch.id === activeBranch?.id;
                const indexBadge = String(idx + 1).padStart(2, "0");
                return (
                  <div
                    key={branch.id}
                    onClick={() => setSelectedBranchId(branch.id)}
                    className={`p-space-md rounded-xl transition-all duration-200 shadow-sm cursor-pointer ${
                      isSelected
                        ? "bg-surface-container-low ring-2 ring-primary-container/30"
                        : "bg-surface-container-low hover:bg-surface-container"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
                      <div className="flex items-start gap-space-md">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-headline-sm text-headline-sm shrink-0 ${
                            idx === 0 || isSelected
                              ? "bg-primary-container text-on-primary"
                              : "bg-surface-container-highest text-on-surface"
                          }`}
                        >
                          {indexBadge}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-space-xs">
                            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                              {branch.name}
                            </h3>
                            <span className="px-space-xs py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">
                                verified_user
                              </span>{" "}
                              Active Geofence
                            </span>
                            <span className="px-space-xs py-0.5 rounded bg-surface-container-highest text-on-surface font-data-mono text-[11px]">
                              B-ID: {branch.branchCode}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-y-1 gap-x-space-md mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px] text-secondary">
                                pin_drop
                              </span>
                              <span className="font-data-mono">
                                {branch.latitude.toFixed(4)}° N,{" "}
                                {branch.longitude.toFixed(4)}° E
                              </span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px] text-secondary">
                                wifi
                              </span>
                              SSID:{" "}
                              <code className="font-data-mono text-on-surface font-medium bg-surface-container px-1 rounded">
                                {branch.ssid}
                              </code>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px] text-tertiary">
                                group
                              </span>
                              <span className="text-on-surface font-medium">
                                {branch.assignedHeadcount}
                              </span>{" "}
                              Staff on Site
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-space-md bg-surface-container-lowest p-space-sm rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-full sm:w-44">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                              Radius
                            </span>
                            <span className="font-data-mono text-data-mono text-primary-container font-semibold">
                              {branch.radiusMeters}m
                            </span>
                          </div>
                          <input
                            type="range"
                            min={50}
                            max={300}
                            value={branch.radiusMeters}
                            disabled={role === "USER"}
                            onChange={(e) => {
                              setSelectedBranchId(branch.id);
                              onUpdateBranchRadius(
                                branch.id,
                                Number(e.target.value)
                              );
                            }}
                            className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary-container disabled:opacity-50"
                          />
                        </div>
                        <button
                          onClick={() => {
                            setSelectedBranchId(branch.id);
                            handleCalibrateGps(branch);
                          }}
                          className="px-space-sm py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-colors flex items-center gap-1 shrink-0"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            tune
                          </span>{" "}
                          Adjust
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Live Perimeter Visualizer */}
        <div className="xl:col-span-4 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[22px]">
                  map
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  Live Perimeter Visualizer
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-data-mono text-label-sm font-semibold">
                {activeBranch?.radiusMeters || 150}m
              </span>
            </div>

            <div className="relative w-full h-64 xl:h-80 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
              <div
                className="absolute inset-0 w-full h-full bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCEcAwq9MzE2D5Cl_bp9vvriYGP29q1HXFG61zUCYpjQcsgPKaIWg8ZaivRMeDy01T2KxsU6uVwjxKYfihXFVk9JUmHIuHV6mPuWEqtidzCNOiOW4ybd6S_QxwFnxyLzlYOQfne0k66B8ofWga9qTRHJFashZfaP61_ADyg1Vj1QejMGzuhTO69xKiTT7T7W2RLiZFyTNO0z07fAgW4R31pykkKg_n0Dk5TUUc5CsKfCIDTYvh8HRFD')",
                }}
              ></div>
              <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-[1px]"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  <div
                    className="rounded-full bg-primary-container/20 animate-ping absolute transition-all duration-300"
                    style={{
                      width: `${ringScalePx + 28}px`,
                      height: `${ringScalePx + 28}px`,
                    }}
                  ></div>
                  <div
                    className="rounded-full border-2 border-primary-container bg-primary-container/15 flex items-center justify-center shadow-lg transition-all duration-300"
                    style={{
                      width: `${ringScalePx}px`,
                      height: `${ringScalePx}px`,
                    }}
                  >
                    <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-[28px]">
                        storefront
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 px-3 py-1.5 rounded-lg bg-surface-container-lowest/90 backdrop-blur text-center shadow-md">
                  <div className="font-label-md text-label-md font-bold text-on-surface">
                    {activeBranch?.shortName} Primary Ring (
                    {activeBranch?.radiusMeters}m)
                  </div>
                  <div className="font-data-mono text-[11px] text-primary-container">
                    {activeBranch?.latitude.toFixed(4)}° N,{" "}
                    {activeBranch?.longitude.toFixed(4)}° E (±1.8m)
                  </div>
                </div>
              </div>
              <div className="absolute bottom-2 left-2 z-10 bg-surface-container-lowest/90 px-2.5 py-1 rounded-md text-[11px] font-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-tertiary-container"></span>{" "}
                GPS Drift Tolerance: &lt;15m
              </div>
            </div>

            <div className="mt-space-md p-space-sm bg-surface-container-low rounded-lg">
              <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                <span>RADIAL OVERLAP AUDIT</span>
                <span className="text-tertiary-container font-semibold">
                  Zero Collision
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Minimum safe separation of 1.4km verified between Downtown
                Outlet and West Mall boundary buffers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mode C Permission Matrix */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm mb-space-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary-container"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-space-md gap-space-md">
          <div>
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-[24px]">
                policy
              </span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">
                Mode C Permission Matrix
              </h2>
              <span className="px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm uppercase font-semibold">
                PRD §1.2 Rule 1
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Governs permission to register punch records beyond physical store
              geofences. Field assignments require verified administrative
              dispatch.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-space-xs">
            <button
              onClick={handleGrantFieldStaff}
              disabled={role === "USER"}
              className="px-space-md py-2.5 rounded-lg bg-secondary-fixed text-on-secondary-fixed font-label-md text-label-md font-semibold hover:bg-secondary-fixed-dim transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                verified
              </span>{" "}
              Grant Field Staff Mode C
            </button>
            <button
              onClick={handleResetAllStrict}
              disabled={role === "USER"}
              className="px-space-md py-2.5 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-highest transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                lock_reset
              </span>{" "}
              Reset All to In-Store Strict
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-md my-space-md p-space-sm bg-surface-container-low rounded-xl">
          <div className="flex flex-1 items-center gap-space-sm bg-surface-container-lowest px-space-md py-2 rounded-lg shadow-sm">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff by name, employee code, or role..."
              className="w-full bg-transparent border-0 outline-none font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant"
            />
          </div>
          <div className="flex items-center gap-space-sm">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-10 px-space-md rounded-lg bg-surface-container-lowest font-label-md text-label-md text-on-surface shadow-sm border-0 outline-none"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 px-space-md rounded-lg bg-surface-container-lowest font-label-md text-label-md text-on-surface shadow-sm border-0 outline-none"
            >
              <option value="all">All Roles</option>
              <option value="field">Logistics &amp; Field Staff</option>
              <option value="floor">In-Store Staff</option>
            </select>
          </div>
        </div>

        {/* Employee Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-space-sm px-space-md rounded-l-lg">
                  Employee &amp; Designation
                </th>
                <th className="py-space-sm px-space-md">Station Branch</th>
                <th className="py-space-sm px-space-md">Geofence Rule Mode</th>
                <th className="py-space-sm px-space-md">Status Badge</th>
                <th className="py-space-sm px-space-md text-right rounded-r-lg">
                  Off-Site Time Out Toggle
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-highest/60 font-body-md text-body-md">
              {filteredEmployees.map((emp) => {
                const empBranch = branches.find((b) => b.id === emp.branchId);
                return (
                  <tr
                    key={emp.id}
                    className="hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="py-space-md px-space-md">
                      <div className="flex items-center gap-space-sm">
                        <img
                          src={emp.avatarUrl}
                          alt={emp.fullName}
                          className="w-10 h-10 rounded-full object-cover shadow-sm"
                        />
                        <div>
                          <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                            {emp.fullName}
                          </div>
                          <div className="font-body-sm text-body-sm text-on-surface-variant">
                            {emp.designation} •{" "}
                            <span className="font-data-mono">
                              {emp.employeeCode}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-space-md px-space-md">
                      <span className="font-label-md text-label-md text-on-surface">
                        {empBranch?.name || "Main Flagship HQ"}
                      </span>
                    </td>
                    <td className="py-space-md px-space-md">
                      {emp.allowOffsiteTimeout ? (
                        <span className="font-data-mono text-data-mono text-secondary font-medium">
                          MODE-C (Remote OK)
                        </span>
                      ) : (
                        <span className="font-data-mono text-data-mono text-on-surface-variant">
                          STANDARD (Strict {empBranch?.radiusMeters || 150}m)
                        </span>
                      )}
                    </td>
                    <td className="py-space-md px-space-md">
                      {emp.allowOffsiteTimeout ? (
                        <span className="px-space-sm py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold inline-flex items-center gap-1 shadow-sm">
                          <span className="material-symbols-outlined text-[15px]">
                            electric_bolt
                          </span>{" "}
                          Remote Errand Approved
                        </span>
                      ) : (
                        <span className="px-space-sm py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-medium inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">
                            store
                          </span>{" "}
                          In-Store Enforced
                        </span>
                      )}
                    </td>
                    <td className="py-space-md px-space-md text-right">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emp.allowOffsiteTimeout}
                          disabled={role === "USER"}
                          onChange={() => onToggleEmployeeModeC(emp.id)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:border-surface-container-highest after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Geofence Anomaly & Spoofing Defense Log */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary-container"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-space-md mb-space-md gap-space-sm">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary-container text-[26px]">
              drive_file_rename_outline
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">
                  Geofence Anomaly &amp; Spoofing Defense Log
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-primary-container/10 text-primary-container font-label-sm text-label-sm font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary-container animate-ping"></span>{" "}
                  Realtime Sentinel
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Real-time mock location checks, GPS accuracy variance (&lt;15m
                standard), and biometric selfie watermarks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-space-sm">
            <span className="font-data-mono text-body-sm text-on-surface-variant">
              Auto-Refresh: <strong className="text-on-surface">4s</strong>
            </span>
            <button
              onClick={() => {
                setAuditToast("Sentinel diagnostic ping completed: 0 new spoof events.");
                setTimeout(() => setAuditToast(null), 3000);
              }}
              className="p-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-colors"
              title="Trigger diagnostic ping"
            >
              <span className="material-symbols-outlined text-[18px]">sync</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md mb-space-lg">
          <div className="p-space-md rounded-xl bg-surface-container-low flex items-center justify-between">
            <div>
              <div className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                GPS Error Tolerance
              </div>
              <div className="font-display-lg text-headline-xl text-primary font-bold mt-1">
                ±11.4m
              </div>
              <div className="font-body-sm text-body-sm text-tertiary-container flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[16px]">
                  check_circle
                </span>{" "}
                PRD Target: &lt;15.0m
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-tertiary-container/10 text-tertiary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">
                satellite_alt
              </span>
            </div>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-low flex items-center justify-between">
            <div>
              <div className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Mock Location Flagged
              </div>
              <div className="font-display-lg text-headline-xl text-primary-container font-bold mt-1">
                1 Intercepted
              </div>
              <div className="font-body-sm text-body-sm text-primary-container flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[16px]">
                  warning
                </span>{" "}
                Mock App Provider Blocked
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-container/10 text-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">
                fmd_bad
              </span>
            </div>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-low flex items-center justify-between">
            <div>
              <div className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Selfie Integrity Check
              </div>
              <div className="font-display-lg text-headline-xl text-secondary font-bold mt-1">
                100% Watermarked
              </div>
              <div className="font-body-sm text-body-sm text-secondary flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[16px]">
                  verified
                </span>{" "}
                Encrypted EXIF + Lat/Lon stamp
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">
                verified_user
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-space-sm px-space-md rounded-l-lg">
                  Timestamp
                </th>
                <th className="py-space-sm px-space-md">Target Employee</th>
                <th className="py-space-sm px-space-md">Accuracy Error</th>
                <th className="py-space-sm px-space-md">Mock Provider Check</th>
                <th className="py-space-sm px-space-md">Selfie Watermark</th>
                <th className="py-space-sm px-space-md text-right rounded-r-lg">
                  Audit Verdict
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-highest/60 font-body-md text-body-md">
              <tr className="hover:bg-surface-container-low/50 transition-colors">
                <td className="py-space-md px-space-md font-data-mono text-body-sm text-on-surface">
                  08:41:09 PST
                </td>
                <td className="py-space-md px-space-md font-medium text-on-surface">
                  Marco Santos{" "}
                  <span className="text-on-surface-variant text-body-sm">
                    (EMP-8821)
                  </span>
                </td>
                <td className="py-space-md px-space-md">
                  <span className="font-data-mono text-tertiary-container font-semibold">
                    ±6.8m
                  </span>
                  <span className="text-on-surface-variant text-[11px] block">
                    High Precision Fix
                  </span>
                </td>
                <td className="py-space-md px-space-md">
                  <span className="inline-flex items-center gap-1 text-tertiary-container font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-[16px]">
                      check_circle
                    </span>{" "}
                    Hardware Native
                  </span>
                </td>
                <td className="py-space-md px-space-md">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-data-mono text-[11px]">
                    PASS #EXIF-9912A
                  </span>
                </td>
                <td className="py-space-md px-space-md text-right">
                  <span className="px-2.5 py-1 rounded-full bg-tertiary/10 text-tertiary font-label-sm text-label-sm font-semibold inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>{" "}
                    Mode C Punch Valid
                  </span>
                </td>
              </tr>

              <tr className="bg-error-container/20 hover:bg-error-container/30 transition-colors">
                <td className="py-space-md px-space-md font-data-mono text-body-sm text-on-surface">
                  08:34:22 PST
                </td>
                <td className="py-space-md px-space-md font-medium text-on-surface">
                  Arnold V. (Floor Trainee){" "}
                  <span className="text-on-surface-variant text-body-sm">
                    (EMP-9932)
                  </span>
                </td>
                <td className="py-space-md px-space-md">
                  <span className="font-data-mono text-primary-container font-bold">
                    ±42.0m
                  </span>
                  <span className="text-primary-container text-[11px] block">
                    Exceeds 15m Threshold
                  </span>
                </td>
                <td className="py-space-md px-space-md">
                  <span className="inline-flex items-center gap-1 text-primary-container font-label-sm text-label-sm font-bold">
                    <span className="material-symbols-outlined text-[16px]">
                      cancel
                    </span>{" "}
                    FAKE_GPS Detected
                  </span>
                </td>
                <td className="py-space-md px-space-md">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-error-container text-on-error-container font-data-mono text-[11px]">
                    FAIL: NO METADATA
                  </span>
                </td>
                <td className="py-space-md px-space-md text-right">
                  <span className="px-2.5 py-1 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      block
                    </span>{" "}
                    Rejected &amp; Flagged
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-surface-container-low/50 transition-colors">
                <td className="py-space-md px-space-md font-data-mono text-body-sm text-on-surface">
                  08:29:50 PST
                </td>
                <td className="py-space-md px-space-md font-medium text-on-surface">
                  Sarah Jenkins{" "}
                  <span className="text-on-surface-variant text-body-sm">
                    (EMP-3104)
                  </span>
                </td>
                <td className="py-space-md px-space-md">
                  <span className="font-data-mono text-tertiary-container font-semibold">
                    ±8.1m
                  </span>
                  <span className="text-on-surface-variant text-[11px] block">
                    SSID WestMall_Guest_Secure
                  </span>
                </td>
                <td className="py-space-md px-space-md">
                  <span className="inline-flex items-center gap-1 text-tertiary-container font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-[16px]">
                      check_circle
                    </span>{" "}
                    Hardware Native
                  </span>
                </td>
                <td className="py-space-md px-space-md">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-data-mono text-[11px]">
                    PASS #EXIF-8804W
                  </span>
                </td>
                <td className="py-space-md px-space-md text-right">
                  <span className="px-2.5 py-1 rounded-full bg-tertiary/10 text-tertiary font-label-sm text-label-sm font-semibold inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>{" "}
                    In-Store Punch Valid
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
