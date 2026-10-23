"use client";

import React, { useEffect, useState } from "react";
import {
  AccessRole,
  AttendanceLog,
  Branch,
  Employee,
  GpsPosition,
  ShiftTemplate,
} from "@/types/attendance";
import {
  INITIAL_BRANCHES,
  INITIAL_EMPLOYEES,
  INITIAL_SHIFTS,
  getInitialAttendanceLogs,
} from "@/lib/mockData";
import { LiveOperationsDashboard } from "@/components/LiveOperationsDashboard";
import { MobilePunchStation } from "@/components/MobilePunchStation";
import BranchGeofencesControls from "@/components/BranchGeofencesControls";
import ShiftSchedulingManager from "@/components/ShiftSchedulingManager";
import PayrollExportCenter from "@/components/PayrollExportCenter";

type ActiveScreen =
  | "dashboard"
  | "geofences"
  | "scheduling"
  | "payroll"
  | "punch-station";

export default function JayteesAttendanceApp() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("dashboard");
  const [role, setRole] = useState<AccessRole>("SYSAD");

  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [shifts, setShifts] = useState<ShiftTemplate[]>(INITIAL_SHIFTS);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [storageUsedMb, setStorageUsedMb] = useState<number>(180);

  // Active employee for Mobile Punch Station Simulator
  const [selectedEmpId, setSelectedEmpId] = useState<string>("emp-benigno");

  // Simulated / Real GPS state for Mobile Punch Station
  const [currentGps, setCurrentGps] = useState<GpsPosition>({
    latitude: INITIAL_BRANCHES[0].latitude + 0.00011,
    longitude: INITIAL_BRANCHES[0].longitude + 0.00008,
    accuracyMeters: 12,
    isSimulated: true,
    label: "Inside Jaytees Flagship / Main Store (18m)",
  });

  // Live PST Clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLogs(getInitialAttendanceLogs());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Switch active persona / screen when RBAC Role is changed
  const handleSelectRole = (nextRole: AccessRole) => {
    setRole(nextRole);
    if (nextRole === "USER") {
      setActiveScreen("punch-station");
    }
  };

  // Update Branch Radius
  const handleUpdateBranchRadius = (branchId: string, radiusMeters: number) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === branchId ? { ...b, radiusMeters } : b))
    );
  };

  // Update Branch Coordinates
  const handleUpdateBranchCoords = (
    branchId: string,
    latitude: number,
    longitude: number
  ) => {
    setBranches((prev) =>
      prev.map((b) =>
        b.id === branchId ? { ...b, latitude, longitude } : b
      )
    );
  };

  // Toggle Mode C per employee
  const handleToggleEmployeeModeC = (employeeId: string) => {
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId
          ? { ...e, allowOffsiteTimeout: !e.allowOffsiteTimeout }
          : e
      )
    );
  };

  // Bulk Mode C actions
  const handleSetBulkModeC = (mode: "grant_field" | "reset_strict") => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (mode === "reset_strict") {
          return { ...emp, allowOffsiteTimeout: false };
        }
        const isFieldCandidate =
          emp.designation.toLowerCase().includes("logistics") ||
          emp.designation.toLowerCase().includes("runner") ||
          emp.designation.toLowerCase().includes("delivery");
        return isFieldCandidate
          ? { ...emp, allowOffsiteTimeout: true }
          : emp;
      })
    );
  };

  // Update Shift Grace Period
  const handleUpdateShiftGrace = (
    shiftId: string,
    gracePeriodMins: number
  ) => {
    setShifts((prev) =>
      prev.map((s) => (s.id === shiftId ? { ...s, gracePeriodMins } : s))
    );
  };

  // Add Custom Shift Template
  const handleAddCustomShift = (newShift: ShiftTemplate) => {
    setShifts((prev) => [...prev, newShift]);
  };

  // GPS Simulation Handlers for Mobile Punch Station
  const handleSimulateGpsBranch = (branch: Branch) => {
    setCurrentGps({
      latitude: branch.latitude + 0.00011,
      longitude: branch.longitude + 0.00008,
      accuracyMeters: 12,
      isSimulated: true,
      label: `Inside ${branch.name} (~18m)`,
    });
  };

  const handleSimulateGpsOutside = () => {
    setCurrentGps({
      latitude: 14.5588,
      longitude: 121.0315,
      accuracyMeters: 14,
      isSimulated: true,
      label: "Off-Site Client / BDO Bank Errand (~850m from Store)",
    });
  };

  const handleRequestRealGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: Math.round(pos.coords.accuracy || 15),
          isSimulated: false,
          label: "Live Hardware GPS Fix",
        });
      },
      () => {
        // Fallback if denied
        handleSimulateGpsBranch(branches[0]);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Record Time In & Time Out from Mobile Punch Station
  const handleRecordTimeIn = (newLog: AttendanceLog) => {
    setLogs((prev) => [newLog, ...prev]);
  };

  const handleRecordTimeOut = (updatedLog: AttendanceLog) => {
    setLogs((prev) =>
      prev.map((l) => (l.id === updatedLog.id ? updatedLog : l))
    );
  };

  // Admin review / override on flagged log
  const handleOverrideLogFlag = (logId: string) => {
    setLogs((prev) =>
      prev.map((l) =>
        l.id === logId
          ? {
              ...l,
              reviewedByAdmin: true,
              statusFlag: l.isOffsiteTimeout
                ? "MODE_C_APPROVED"
                : "IN_GEOFENCE",
            }
          : l
      )
    );
  };

  const activeEmployee =
    employees.find((e) => e.id === selectedEmpId) || employees[0];

  // Active Persona for Top Right Header
  const headerPersona =
    role === "SYSAD"
      ? employees.find((e) => e.id === "emp-elena") || employees[4]
      : role === "ADMIN"
      ? employees.find((e) => e.id === "emp-carla") || employees[6]
      : activeEmployee;

  const formattedClock = mounted
    ? currentTime.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) + " PST"
    : "08:42:15 PST";

  const navItems: {
    id: ActiveScreen;
    label: string;
    icon: string;
    adminOnly?: boolean;
  }[] = [
    { id: "dashboard", label: "Dashboard", icon: "grid_view" },
    {
      id: "geofences",
      label: "Branch Geofences & Controls",
      icon: "share_location",
    },
    {
      id: "scheduling",
      label: "Shift Scheduling",
      icon: "calendar_month",
    },
    {
      id: "payroll",
      label: "Payroll CSV & Export",
      icon: "receipt_long",
    },
    {
      id: "punch-station",
      label: "Punch Station Simulator",
      icon: "pin_invoke",
    },
  ];

  const storagePercent = Math.round((storageUsedMb / 1000) * 100);

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface">
      {/* Left Fixed Sidebar (Desktop) */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-72 bg-surface-container-lowest z-50 flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col">
          <div className="h-16 px-space-lg flex items-center gap-space-sm bg-surface-container-low">
            <div className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse"></div>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Attendance Engine Core
            </span>
          </div>

          <div className="px-space-md py-space-sm">
            <div className="px-space-sm py-space-xs font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Operational Navigation
            </div>
            <nav className="flex flex-col gap-space-xs mt-space-xs">
              {navItems.map((item) => {
                const isActive = activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveScreen(item.id)}
                    className={`flex items-center gap-space-sm px-space-md py-space-sm rounded-lg text-left transition-all ${
                      isActive
                        ? "bg-primary-container text-on-primary font-label-lg shadow-sm"
                        : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {item.icon}
                    </span>
                    <span className="font-label-lg text-label-lg">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Interactive 3-Tier RBAC Switcher inside Sidebar for rapid testing */}
          <div className="px-space-md pt-space-sm">
            <div className="p-space-sm rounded-xl bg-surface-container-low border border-outline-variant/30">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  3-Tier RBAC Simulator
                </span>
                <span className="px-1.5 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-data-mono text-[10px] font-bold">
                  {role}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(["SYSAD", "ADMIN", "USER"] as AccessRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleSelectRole(r)}
                    className={`py-1.5 rounded-lg font-label-sm text-[11px] font-bold transition-all ${
                      role === r
                        ? "bg-primary-container text-on-primary shadow-sm"
                        : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Supabase Cache Gauge */}
        <div className="p-space-md bg-surface-container-low m-space-md rounded-xl">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              Supabase Cache
            </span>
            <span className="font-label-sm text-label-sm text-tertiary-container font-semibold">
              {storagePercent}% Used
            </span>
          </div>
          <div className="w-full bg-surface-container-highest h-1.5 rounded-full mt-space-xs overflow-hidden">
            <div
              className="bg-tertiary-container h-full transition-all duration-500"
              style={{ width: `${storagePercent}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between mt-space-xs">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Purge Active
            </span>
            <span className="font-data-mono text-data-mono text-[11px] text-on-surface-variant">
              {storageUsedMb}MB/1GB
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-72">
        {/* Top Fixed Header */}
        <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40">
          <div className="h-16 w-full px-space-md lg:px-space-lg flex items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-headline-sm font-bold shadow-sm">
                  J
                </div>
                <span className="font-headline-sm text-headline-sm tracking-tight text-primary-container font-bold">
                  JATS v1.1
                </span>
              </div>

              <div className="hidden xl:flex items-center gap-space-xs bg-surface-container-low px-space-sm py-space-xs rounded-full shadow-[0_0_0_1px_rgba(217,119,6,0.35)]">
                <span className="material-symbols-outlined text-secondary text-[16px]">
                  store
                </span>
                <span className="font-label-sm text-label-sm text-secondary font-medium">
                  All 3 Branches (Main, Downtown, West Mall)
                </span>
              </div>

              <div className="hidden 2xl:flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-surface-container-high">
                <span className="w-2 h-2 rounded-full bg-tertiary-container"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                  {role === "SYSAD"
                    ? "SysAd Mode (3-Tier RBAC)"
                    : role === "ADMIN"
                    ? "Branch Admin Mode (RBAC)"
                    : "Employee Punch Mode (RBAC)"}
                </span>
              </div>
            </div>

            {/* Mobile Screen Selector */}
            <div className="flex lg:hidden items-center gap-1">
              <select
                value={activeScreen}
                onChange={(e) =>
                  setActiveScreen(e.target.value as ActiveScreen)
                }
                className="h-9 px-2 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md border border-outline-variant/40"
              >
                {navItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-space-md">
              <div className="hidden lg:flex flex-col text-right pr-space-sm">
                <div className="font-data-mono text-data-mono text-on-surface font-semibold flex items-center justify-end gap-space-xs">
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    schedule
                  </span>
                  <span>{formattedClock}</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Philippine Standard Time
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-surface-container-low shadow-[0_0_0_1px_rgba(16,185,129,0.3)]">
                <span className="material-symbols-outlined text-tertiary-container text-[16px]">
                  cloud_done
                </span>
                <span className="font-label-sm text-label-sm text-tertiary-container font-medium">
                  {storageUsedMb} MB / 1 GB
                </span>
              </div>

              <button
                onClick={() => setActiveScreen("punch-station")}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold hover:bg-secondary-fixed-dim transition-colors"
                title="Open Mobile Punch Station Simulator"
              >
                <span className="material-symbols-outlined text-[16px]">
                  photo_camera_front
                </span>
                <span>Punch Kiosk</span>
              </button>

              <div className="flex items-center gap-space-sm pl-space-xs">
                <img
                  alt={headerPersona.fullName}
                  className="w-8 h-8 rounded-full object-cover"
                  src={headerPersona.avatarUrl}
                />
                <div className="hidden sm:flex flex-col text-left">
                  <span className="font-label-md text-label-md text-on-surface leading-tight font-semibold">
                    {headerPersona.fullName}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight">
                    {headerPersona.designation}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Workspace Container */}
        <main className="w-full pt-20 bg-surface px-space-md lg:px-space-lg pb-space-xl">
          {activeScreen === "dashboard" && (
            <LiveOperationsDashboard
              branches={branches}
              employees={employees}
              shifts={shifts}
              logs={logs}
              storageUsedMb={storageUsedMb}
              onLaunchPunchStation={() => setActiveScreen("punch-station")}
              onExportCsv={() => setActiveScreen("payroll")}
              onPurgeStorage={() => setStorageUsedMb(138)}
              onOverrideLogFlag={handleOverrideLogFlag}
            />
          )}

          {activeScreen === "geofences" && (
            <BranchGeofencesControls
              role={role}
              branches={branches}
              employees={employees}
              onUpdateBranchRadius={handleUpdateBranchRadius}
              onUpdateBranchCoords={handleUpdateBranchCoords}
              onToggleEmployeeModeC={handleToggleEmployeeModeC}
              onSetBulkModeC={handleSetBulkModeC}
            />
          )}

          {activeScreen === "scheduling" && (
            <ShiftSchedulingManager
              role={role}
              branches={branches}
              shifts={shifts}
              onUpdateShiftGrace={handleUpdateShiftGrace}
              onAddCustomShift={handleAddCustomShift}
            />
          )}

          {activeScreen === "payroll" && (
            <PayrollExportCenter
              role={role}
              branches={branches}
              employees={employees}
              logs={logs}
            />
          )}

          {activeScreen === "punch-station" && (
            <MobilePunchStation
              employee={activeEmployee}
              employees={employees}
              branches={branches}
              shifts={shifts}
              logs={logs}
              currentGps={currentGps}
              currentTime={currentTime}
              onSelectEmployee={setSelectedEmpId}
              onSimulateGpsBranch={handleSimulateGpsBranch}
              onSimulateGpsOutside={handleSimulateGpsOutside}
              onRequestRealGps={handleRequestRealGps}
              onRecordTimeIn={handleRecordTimeIn}
              onRecordTimeOut={handleRecordTimeOut}
            />
          )}
        </main>
      </div>
    </div>
  );
}
