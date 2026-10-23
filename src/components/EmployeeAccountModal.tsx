"use client";

import React, { useState } from "react";
import { AccessRole, Branch, Employee, ShiftTemplate } from "@/types/attendance";

interface EmployeeAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: AccessRole;
  currentUserBranchId: string;
  branches: Branch[];
  shifts: ShiftTemplate[];
  onSaveEmployee: (newEmployee: Employee) => void;
}

export function EmployeeAccountModal({
  isOpen,
  onClose,
  currentUserRole,
  currentUserBranchId,
  branches,
  shifts,
  onSaveEmployee,
}: EmployeeAccountModalProps) {
  if (!isOpen) return null;

  const isSysAd = currentUserRole === "SYSAD";

  const [fullName, setFullName] = useState("");
  const [employeeCode, setEmployeeCode] = useState(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
  const [designation, setDesignation] = useState("Store Floor Crew");
  const [role, setRole] = useState<AccessRole>("USER");
  const [branchId, setBranchId] = useState(isSysAd ? branches[0]?.id || "branch-1" : currentUserBranchId);
  const [shiftId, setShiftId] = useState(shifts[0]?.id || "shift-open");
  const [allowOffsiteTimeout, setAllowOffsiteTimeout] = useState(false);
  const [pinCode, setPinCode] = useState("1234");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg("Please enter employee full name.");
      return;
    }

    if (!employeeCode.trim()) {
      setErrorMsg("Please specify employee code.");
      return;
    }

    const created: Employee = {
      id: `emp-${Date.now()}`,
      employeeCode: employeeCode.trim().toUpperCase(),
      fullName: fullName.trim(),
      designation: designation.trim(),
      role: isSysAd ? role : "USER",
      branchId: isSysAd ? branchId : currentUserBranchId,
      shiftId,
      allowOffsiteTimeout,
      allowMultiBranch: false,
      pinCode: pinCode || "1234",
      avatarUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuC2vqX2j3AMauprhPv42sfB4A5WuFlsvGOxO-vKyDBj6v6W7gi8Ka05erA3Y0MliuPEmD0Mh5QjIK_AAAqOwnt5hehmjBYShT3z6jQODBXCLsIcdlKmdcTnzIOz_YrcrWD4bZiv2g1vTRTXvYUf7_V6kZF0qSjjFh_VFeeQQPzPodql6kGb5dlvnun9158lQ9-ldrv73qbKfxCBgF_SSLlD8WInFT5SNREF25Ypee--XyWEdak-gCo-",
      isActive: true,
    };

    onSaveEmployee(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-space-md animate-in fade-in">
      <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-space-lg shadow-xl border border-outline-variant/30 flex flex-col gap-space-md">
        <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-highest/60">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[24px] text-primary-container">
              person_add
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
              New Employee Account
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-space-sm rounded-xl bg-error-container text-on-error-container font-label-md text-label-md">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          <div className="grid grid-cols-2 gap-space-sm">
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Dela Cruz"
                className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md outline-none focus:ring-2 focus:ring-primary-container/40"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant">
                Employee Code
              </label>
              <input
                type="text"
                required
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                placeholder="EMP-9001"
                className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-data-mono font-bold outline-none focus:ring-2 focus:ring-primary-container/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-space-sm">
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant">
                Designation / Job Title
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Barista / Cashier"
                className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md outline-none focus:ring-2 focus:ring-primary-container/40"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant">
                Default PIN (4 digits)
              </label>
              <input
                type="text"
                maxLength={4}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                placeholder="1234"
                className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-data-mono font-bold outline-none focus:ring-2 focus:ring-primary-container/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-space-sm">
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant">
                Branch Location
              </label>
              <select
                disabled={!isSysAd}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-label-md outline-none focus:ring-2 focus:ring-primary-container/40 disabled:opacity-75"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant">
                Default Shift
              </label>
              <select
                value={shiftId}
                onChange={(e) => setShiftId(e.target.value)}
                className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-label-md outline-none focus:ring-2 focus:ring-primary-container/40"
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime} - {s.endTime})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode C Permission Switch */}
          <div className="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md font-bold text-on-surface">
                Mode C (Off-site Time Out)
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Enable remote clock-out for courier, runner, or delivery assignments.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowOffsiteTimeout}
                onChange={(e) => setAllowOffsiteTimeout(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:border-surface-container-highest after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-space-sm pt-space-sm border-t border-surface-container-highest/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-label-md hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-primary text-on-primary font-label-md font-bold hover:bg-primary-container shadow-md transition-all"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
