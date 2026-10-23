"use client";

import React, { useState } from "react";
import { AccessRole, Branch, Employee } from "@/types/attendance";
import { AuthSession, saveSession } from "@/lib/auth";

interface LoginModalProps {
  isOpen: boolean;
  employees: Employee[];
  branches: Branch[];
  onLoginSuccess: (session: AuthSession) => void;
  onClose?: () => void;
}

export function LoginScreen({
  employees,
  branches,
  onLoginSuccess,
}: {
  employees: Employee[];
  branches: Branch[];
  onLoginSuccess: (session: AuthSession) => void;
}) {
  const [employeeCode, setEmployeeCode] = useState("");
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Quick Account Picker for easy testing of each role
  const sampleAccounts = [
    { code: "SYS-0001", role: "SYSAD" as AccessRole, name: "Elena Vance (SysAd)", branch: "All Branches" },
    { code: "EMP-3104", role: "ADMIN" as AccessRole, name: "Sarah Jenkins (Admin)", branch: "West Mall" },
    { code: "EMP-6502", role: "USER" as AccessRole, name: "Mang Benigno (Field / Mode C)", branch: "Main Store" },
    { code: "EMP-4319", role: "USER" as AccessRole, name: "Liza Dela Cruz (Cashier)", branch: "Main Store" },
  ];

  const handleSelectSample = (code: string) => {
    setEmployeeCode(code);
    setPin("1234");
    setErrorMsg(null);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCode = employeeCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg("Please enter your Employee Code.");
      return;
    }

    if (pin.length < 4) {
      setErrorMsg("Please enter your 4-digit PIN.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Find employee by code
      const emp = employees.find(
        (e) => e.employeeCode.toUpperCase() === cleanCode
      );

      if (!emp) {
        setIsLoading(false);
        setErrorMsg("Employee Code not found. Please check with your branch supervisor.");
        return;
      }

      // PIN validation (default 1234 in seed data)
      if (emp.pinCode && emp.pinCode !== pin) {
        setIsLoading(false);
        setErrorMsg("Incorrect 4-digit PIN. Please try again.");
        return;
      }

      const session: AuthSession = {
        userId: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        role: emp.role,
        branchId: emp.branchId,
        allowOffsiteTimeout: emp.allowOffsiteTimeout,
        pinChanged: emp.pinCode !== "1234",
      };

      saveSession(session);
      setIsLoading(false);
      onLoginSuccess(session);
    }, 450);
  };

  const appendPinDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
    }
  };

  const backspacePin = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-space-md selection:bg-primary-container selection:text-on-primary">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-space-lg shadow-lg border border-outline-variant/30 flex flex-col gap-space-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-1">
          <div className="w-14 h-14 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center font-headline-xl font-bold shadow-md">
            J
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-extrabold tracking-tight mt-2">
            Jaytees JATS
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Employee Attendance &amp; Monitoring Kiosk (v1.1)
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-space-sm rounded-xl bg-error-container text-on-error-container font-label-md text-label-md flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-space-md">
          {/* Employee Code Input */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
              Employee Code
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant text-[20px]">
                badge
              </span>
              <input
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                placeholder="e.g. EMP-6502"
                className="w-full h-12 pl-10 pr-3 rounded-xl bg-surface-container-low text-on-surface font-data-mono text-body-lg uppercase font-bold outline-none focus:ring-2 focus:ring-primary-container/40"
              />
            </div>
          </div>

          {/* 4-Digit PIN */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                Security PIN
              </label>
              <span className="font-label-sm text-[11px] text-on-surface-variant">
                Default: 1234
              </span>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant text-[20px]">
                lock
              </span>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full h-12 pl-10 pr-3 rounded-xl bg-surface-container-low text-on-surface font-data-mono text-headline-sm tracking-widest font-bold outline-none focus:ring-2 focus:ring-primary-container/40"
              />
            </div>
          </div>

          {/* Senior-Friendly On-Screen PIN Pad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map(
              (btn) => {
                const isClear = btn === "C";
                const isBack = btn === "⌫";
                return (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => {
                      if (isClear) setPin("");
                      else if (isBack) backspacePin();
                      else appendPinDigit(btn);
                    }}
                    className={`h-12 rounded-xl font-headline-sm font-bold transition-all active:scale-95 ${
                      isClear || isBack
                        ? "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                        : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    {btn}
                  </button>
                );
              }
            )}
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isLoading}
            className="h-14 mt-1 rounded-xl bg-primary text-on-primary font-headline-sm font-bold shadow-md hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-[22px] animate-spin">
                  progress_activity
                </span>
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[22px]">
                  login
                </span>
                <span>Sign In to Terminal</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Switcher */}
        <div className="pt-space-sm border-t border-surface-container-highest/60 flex flex-col gap-1.5">
          <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider text-center">
            Role Routing Simulator (One-Click)
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {sampleAccounts.map((acc) => (
              <button
                key={acc.code}
                type="button"
                onClick={() => handleSelectSample(acc.code)}
                className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-left transition-colors flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-[11px] font-bold text-on-surface">
                    {acc.code}
                  </span>
                  <span
                    className={`text-[9px] px-1 rounded font-bold uppercase ${
                      acc.role === "SYSAD"
                        ? "bg-primary-container text-on-primary"
                        : acc.role === "ADMIN"
                        ? "bg-secondary-fixed text-on-secondary-fixed"
                        : "bg-tertiary-fixed text-on-tertiary-fixed"
                    }`}
                  >
                    {acc.role}
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant truncate">
                  {acc.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
