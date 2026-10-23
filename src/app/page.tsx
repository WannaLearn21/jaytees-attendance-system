"use client";

import React, { useEffect, useState } from "react";
import {
  AccessRole,
  AttendanceLog,
  AuditLogEntry,
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
import { AuthSession, clearSession, getStoredSession, saveSession } from "@/lib/auth";
import { LoginScreen } from "@/components/LoginScreen";
import { EmployeeAccountModal } from "@/components/EmployeeAccountModal";
import { LiveOperationsDashboard } from "@/components/LiveOperationsDashboard";
import StaffAndShiftsManager from "@/components/StaffAndShiftsManager";
import { PhotoStorageManager } from "@/components/PhotoStorageManager";
import BranchGeofencesControls from "@/components/BranchGeofencesControls";
import PayrollExportCenter from "@/components/PayrollExportCenter";
import { MobilePunchStation } from "@/components/MobilePunchStation";

type ActiveScreen =
  | "live-attendance"
  | "staff-and-shifts"
  | "payroll-export"
  | "branches-and-geofence"
  | "photo-storage"
  | "punch-station";

export default function JayteesAttendanceApp() {
  const [activeScreen, setActiveScreen] =
    useState<ActiveScreen>("live-attendance");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);

  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [shifts, setShifts] = useState<ShiftTemplate[]>(INITIAL_SHIFTS);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [storageUsedMb, setStorageUsedMb] = useState<number>(180);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL");

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: "audit-init-1",
      tableName: "branches",
      recordId: "branch-1",
      action: "INSERT",
      changedBy: "SYS-0001",
      changedByName: "Elena Vance (SysAd)",
      branchId: "branch-1",
      reason: "Initial geofence configuration calibration (150m radius)",
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: "audit-init-2",
      tableName: "shifts",
      recordId: "shift-open",
      action: "UPDATE",
      changedBy: "SYS-0001",
      changedByName: "Elena Vance (SysAd)",
      branchId: "branch-1",
      reason: "Adjusted morning shift grace period to 15 mins per store policy",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ]);

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

    // Check for stored PWA session
    const stored = getStoredSession();
    if (stored) {
      setSession(stored);
      if (stored.role === "USER") {
        setActiveScreen("punch-station");
        setSelectedEmpId(stored.userId);
      } else if (stored.role === "ADMIN") {
        setSelectedBranchId(stored.branchId || "branch-1");
      }
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const role: AccessRole = session?.role || "SYSAD";

  // Login handler
  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    setSelectedEmpId(newSession.userId);
    if (newSession.role === "USER") {
      setActiveScreen("punch-station");
    } else {
      setActiveScreen("live-attendance");
      if (newSession.role === "ADMIN") {
        setSelectedBranchId(newSession.branchId || "branch-1");
      } else {
        setSelectedBranchId("ALL");
      }
    }
  };

  // Sign out
  const handleSignOut = () => {
    clearSession();
    setSession(null);
  };

  // Switch role simulator
  const handleSelectRole = (nextRole: AccessRole) => {
    if (!session) return;
    const updated: AuthSession = { ...session, role: nextRole };
    setSession(updated);
    saveSession(updated);
    if (nextRole === "USER") {
      setActiveScreen("punch-station");
    } else if (nextRole === "ADMIN") {
      setSelectedBranchId(session.branchId || "branch-1");
      if (activeScreen === "punch-station") setActiveScreen("live-attendance");
    } else {
      setSelectedBranchId("ALL");
      if (activeScreen === "punch-station") setActiveScreen("live-attendance");
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
      prev.map((b) => (b.id === branchId ? { ...b, latitude, longitude } : b))
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

  // Add new employee account
  const handleSaveEmployeeAccount = (newEmp: Employee) => {
    setEmployees((prev) => [newEmp, ...prev]);
  };

  // Update existing employee
  const handleUpdateEmployee = (updatedEmp: Employee) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === updatedEmp.id ? updatedEmp : e))
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

  // Update Shift Template
  const handleUpdateShift = (updatedShift: ShiftTemplate) => {
    setShifts((prev) =>
      prev.map((s) => (s.id === updatedShift.id ? updatedShift : s))
    );
  };

  // Attendance Correction (Card 5.5)
  const handleSaveCorrection = (
    updatedLog: AttendanceLog,
    auditEntry: AuditLogEntry
  ) => {
    setLogs((prev) => {
      const exists = prev.some((l) => l.id === updatedLog.id);
      return exists
        ? prev.map((l) => (l.id === updatedLog.id ? updatedLog : l))
        : [updatedLog, ...prev];
    });
    setAuditLogs((prev) => [auditEntry, ...prev]);
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

  // Show Login Screen if no active session
  if (!session) {
    return (
      <LoginScreen
        employees={employees}
        branches={branches}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  const activeEmployee =
    employees.find((e) => e.id === selectedEmpId) || employees[0];

  const headerPersona =
    employees.find((e) => e.id === session.userId) || activeEmployee;

  const formattedClock = mounted
    ? currentTime.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) + " PST"
    : "08:42:15 PST";

  return (
    <div className="min-h-screen bg-[#F4F4F2] font-sans text-[#1B1B1A]">
      {/* Wireframe-matched Layout: Left Sidebar (width 220px) + Main Content */}
      <div className="flex min-h-screen">
        {/* Navigation Sidebar */}
        <aside className="w-[230px] flex-none bg-white border-r border-[#C9C9C4] p-5 flex flex-col justify-between box-border z-30 min-h-screen">
          <div className="flex flex-col gap-1">
            {/* Header matching wireframe: Jaytees JATS */}
            <div className="text-[20px] font-extrabold text-[#1B1B1A] px-3 pb-4 flex items-center justify-between">
              <span>Jaytees JATS</span>
              <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                v1.1
              </span>
            </div>

            {/* Main Navigation Links matching wireframe */}
            {role !== "USER" ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveScreen("live-attendance")}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-[15px] font-semibold transition-all flex items-center gap-2.5 ${
                    activeScreen === "live-attendance"
                      ? "bg-[#1B1B1A] text-white shadow-xs"
                      : "text-[#1B1B1A] hover:bg-slate-100"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    grid_view
                  </span>
                  <span>Live attendance</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveScreen("staff-and-shifts")}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-[15px] font-semibold transition-all flex items-center gap-2.5 ${
                    activeScreen === "staff-and-shifts"
                      ? "bg-[#1B1B1A] text-white shadow-xs"
                      : "text-[#1B1B1A] hover:bg-slate-100"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    groups
                  </span>
                  <span>Staff and shifts</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveScreen("payroll-export")}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-[15px] font-semibold transition-all flex items-center gap-2.5 ${
                    activeScreen === "payroll-export"
                      ? "bg-[#1B1B1A] text-white shadow-xs"
                      : "text-[#1B1B1A] hover:bg-slate-100"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    receipt_long
                  </span>
                  <span>Payroll export</span>
                </button>

                {/* SysAd only Section matching wireframe */}
                {role === "SYSAD" && (
                  <>
                    <div className="text-[12px] text-[#4A4A47] px-3 pt-5 pb-1 uppercase tracking-wider font-bold">
                      SysAd only
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveScreen("branches-and-geofence")}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-[15px] font-semibold transition-all flex items-center gap-2.5 ${
                        activeScreen === "branches-and-geofence"
                          ? "bg-[#1B1B1A] text-white shadow-xs"
                          : "text-[#1B1B1A] hover:bg-slate-100"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        share_location
                      </span>
                      <span>Branches and geofence</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveScreen("photo-storage")}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-[15px] font-semibold transition-all flex items-center gap-2.5 ${
                        activeScreen === "photo-storage"
                          ? "bg-[#1B1B1A] text-white shadow-xs"
                          : "text-[#1B1B1A] hover:bg-slate-100"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        photo_library
                      </span>
                      <span>Photo storage</span>
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-600 leading-relaxed">
                You are currently signed in as an employee terminal user. Access is restricted to the punch kiosk.
              </div>
            )}

            {/* Senior-Friendly Punch Kiosk Simulator / View */}
            <div className="pt-4 border-t border-[#E3E3DF] mt-2">
              <button
                type="button"
                onClick={() => setActiveScreen("punch-station")}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-[15px] font-semibold transition-all flex items-center gap-2.5 ${
                  activeScreen === "punch-station"
                    ? "bg-[#1B1B1A] text-white shadow-xs"
                    : "text-[#1B1B1A] hover:bg-slate-100"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  photo_camera_front
                </span>
                <span>Punch screen</span>
              </button>
            </div>
          </div>

          {/* Bottom Sidebar: Role simulator & user profile */}
          <div className="flex flex-col gap-3 pt-4 border-t border-[#E3E3DF]">
            {/* 3-Tier RBAC Simulator */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase mb-1.5">
                <span>Role Switcher</span>
                <span className="font-mono text-black">{role}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(["SYSAD", "ADMIN", "USER"] as AccessRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleSelectRole(r)}
                    className={`py-1 rounded text-[11px] font-bold transition-all ${
                      role === r
                        ? "bg-[#1B1B1A] text-white shadow-xs"
                        : "bg-white text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {r === "SYSAD" ? "SysAd" : r === "ADMIN" ? "Admin" : "User"}
                  </button>
                ))}
              </div>
            </div>

            {/* User Profile + Logout */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <img
                  src={headerPersona.avatarUrl}
                  alt={headerPersona.fullName}
                  className="w-8 h-8 rounded-full object-cover border border-[#C9C9C4]"
                />
                <div className="flex flex-col leading-tight truncate">
                  <span className="text-xs font-bold truncate">
                    {headerPersona.fullName}
                  </span>
                  <span className="text-[10px] text-[#4A4A47] truncate">
                    {role} • {branches.find((b) => b.id === session.branchId)?.shortName || "All"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Sign Out"
              >
                <span className="material-symbols-outlined text-[18px]">
                  logout
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-7 lg:p-8 flex flex-col gap-5 box-border overflow-y-auto">
          {activeScreen === "live-attendance" && (
            <LiveOperationsDashboard
              role={role}
              branches={branches}
              employees={employees}
              shifts={shifts}
              logs={logs}
              selectedBranchId={selectedBranchId}
              onSelectBranch={setSelectedBranchId}
              onSaveCorrection={handleSaveCorrection}
              currentUserId={session.userId}
              currentUserName={headerPersona.fullName}
            />
          )}

          {activeScreen === "staff-and-shifts" && (
            <StaffAndShiftsManager
              role={role}
              branches={branches}
              shifts={shifts}
              employees={employees}
              selectedBranchId={
                role === "ADMIN" && session.branchId
                  ? session.branchId
                  : selectedBranchId === "ALL"
                  ? branches[0].id
                  : selectedBranchId
              }
              onSelectBranch={setSelectedBranchId}
              onToggleEmployeeModeC={handleToggleEmployeeModeC}
              onUpdateShiftGrace={handleUpdateShiftGrace}
              onAddCustomShift={handleAddCustomShift}
              onUpdateShift={handleUpdateShift}
              onOpenAddEmployeeModal={() => setShowCreateAccountModal(true)}
              onUpdateEmployee={handleUpdateEmployee}
            />
          )}

          {activeScreen === "payroll-export" && (
            <PayrollExportCenter
              role={role}
              branches={branches}
              employees={employees}
              logs={logs}
            />
          )}

          {activeScreen === "branches-and-geofence" && (
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

          {activeScreen === "photo-storage" && (
            <PhotoStorageManager
              storageUsedMb={storageUsedMb}
              onPurgeStorage={() => setStorageUsedMb(124)}
              auditLogs={auditLogs}
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

      {/* New Employee Account Modal */}
      <EmployeeAccountModal
        isOpen={showCreateAccountModal}
        onClose={() => setShowCreateAccountModal(false)}
        currentUserRole={role}
        currentUserBranchId={session.branchId}
        branches={branches}
        shifts={shifts}
        onSaveEmployee={handleSaveEmployeeAccount}
      />
    </div>
  );
}
