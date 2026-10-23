"use client";

import React, { useState } from "react";
import { AccessRole, Branch, Employee, ShiftTemplate } from "@/types/attendance";

interface StaffAndShiftsManagerProps {
  role: AccessRole;
  branches: Branch[];
  shifts: ShiftTemplate[];
  employees: Employee[];
  selectedBranchId: string;
  onSelectBranch: (branchId: string) => void;
  onToggleEmployeeModeC: (employeeId: string) => void;
  onUpdateShiftGrace: (shiftId: string, gracePeriodMins: number) => void;
  onAddCustomShift?: (shift: ShiftTemplate) => void;
  onUpdateShift?: (shift: ShiftTemplate) => void;
  onOpenAddEmployeeModal: () => void;
  onUpdateEmployee?: (updated: Employee) => void;
}

function format12Hour(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  const h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr || "00"} ${suffix}`;
}

export default function StaffAndShiftsManager({
  role,
  branches,
  shifts,
  employees,
  selectedBranchId,
  onSelectBranch,
  onToggleEmployeeModeC,
  onUpdateShiftGrace,
  onAddCustomShift,
  onUpdateShift,
  onOpenAddEmployeeModal,
  onUpdateEmployee,
}: StaffAndShiftsManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingShift, setEditingShift] = useState<ShiftTemplate | null>(null);
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // New shift form state
  const [newShiftName, setNewShiftName] = useState("");
  const [newShiftStart, setNewShiftStart] = useState("07:00");
  const [newShiftEnd, setNewShiftEnd] = useState("16:00");
  const [newShiftGrace, setNewShiftGrace] = useState(10);

  const activeBranch =
    branches.find((b) => b.id === selectedBranchId) || branches[0];

  const branchShifts = shifts.filter(
    (s) => !s.branchId || s.branchId === selectedBranchId || s.branchId === "branch-1"
  );

  const branchEmployees = employees.filter((e) => {
    const matchesBranch =
      role === "SYSAD" && selectedBranchId === "ALL"
        ? true
        : e.branchId === selectedBranchId;
    const matchesSearch =
      !searchQuery.trim() ||
      e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.designation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  const handleSaveShiftEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift) return;
    if (onUpdateShift) {
      onUpdateShift(editingShift);
    } else {
      onUpdateShiftGrace(editingShift.id, editingShift.gracePeriodMins);
    }
    setEditingShift(null);
  };

  const handleCreateShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShiftName.trim()) return;

    const newTemplate: ShiftTemplate = {
      id: `shift-${Date.now()}`,
      branchId: selectedBranchId === "ALL" ? "branch-1" : selectedBranchId,
      name: newShiftName.trim(),
      badgeText: "Standard Shift",
      description: "Custom branch operational schedule",
      startTime: newShiftStart,
      endTime: newShiftEnd,
      gracePeriodMins: Number(newShiftGrace) || 10,
    };

    if (onAddCustomShift) {
      onAddCustomShift(newTemplate);
    }
    setNewShiftName("");
    setShowAddShiftModal(false);
  };

  const handleSaveEmployeeEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || !onUpdateEmployee) return;
    onUpdateEmployee(editingEmployee);
    setEditingEmployee(null);
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Header matching wireframe: Shifts and staff · [Branch] */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-[28px] font-bold text-[#1B1B1A] tracking-tight">
          Shifts and staff · {activeBranch?.name || "All Branches"}
        </h1>

        {role === "SYSAD" && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#4A4A47]">Branch</span>
            <select
              value={selectedBranchId}
              onChange={(e) => onSelectBranch(e.target.value)}
              className="h-10 px-3 bg-white border border-[#C9C9C4] rounded-lg text-sm font-semibold text-[#1B1B1A] focus:outline-none"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2-Column Wireframe Grid: 340px Shift templates | 1fr Staff */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
        {/* Left Column: Shift templates Card */}
        <div className="bg-white border border-[#C9C9C4] rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 font-bold text-[16px] text-[#1B1B1A] border-b border-[#C9C9C4] flex items-center justify-between">
            <span>Shift templates</span>
            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {branchShifts.length} Active
            </span>
          </div>

          <div className="divide-y divide-[#E3E3DF]">
            {branchShifts.map((shift) => (
              <div
                key={shift.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <div className="font-bold text-[15px] text-[#1B1B1A]">
                    {shift.name}
                  </div>
                  <div className="text-[14px] text-[#4A4A47]">
                    {format12Hour(shift.startTime)} – {format12Hour(shift.endTime)} · grace{" "}
                    {shift.gracePeriodMins} min
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingShift(shift)}
                  className="h-9 px-3 border border-[#6B6B67] rounded-lg bg-white text-sm font-semibold text-[#1B1B1A] hover:bg-slate-100 transition-colors"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-[#E3E3DF] bg-slate-50/50">
            <button
              type="button"
              onClick={() => setShowAddShiftModal(true)}
              className="w-full h-10 px-4 border border-[#6B6B67] rounded-lg bg-white text-sm font-semibold text-[#1B1B1A] hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add shift template</span>
            </button>
          </div>
        </div>

        {/* Right Column: Staff Card */}
        <div className="bg-white border border-[#C9C9C4] rounded-xl overflow-hidden shadow-xs flex flex-col">
          {/* Card Header with Staff Title & Add employee Button */}
          <div className="p-4 border-b border-[#C9C9C4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[16px] text-[#1B1B1A]">Staff</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                {branchEmployees.length} Members
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 px-3 border border-[#C9C9C4] rounded-lg text-sm placeholder:text-slate-400 focus:outline-none w-44 sm:w-56"
              />
              <button
                type="button"
                onClick={onOpenAddEmployeeModal}
                className="h-10 px-4 bg-[#1B1B1A] text-white border border-[#1B1B1A] rounded-lg text-sm font-semibold hover:bg-black transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                <span>Add employee</span>
              </button>
            </div>
          </div>

          {/* Staff Table matching wireframe */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[15px]">
              <thead>
                <tr className="border-b border-[#C9C9C4] text-left bg-slate-50/60">
                  <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                    Role
                  </th>
                  <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                    Default shift
                  </th>
                  <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                    Allow off-site Time Out
                  </th>
                  <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E3DF]">
                {branchEmployees.map((emp) => {
                  const assignedShift =
                    shifts.find((s) => s.id === emp.shiftId) || shifts[0];
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={emp.avatarUrl}
                            alt={emp.fullName}
                            className="w-9 h-9 rounded-full object-cover border border-[#C9C9C4] bg-slate-100"
                          />
                          <div>
                            <div className="font-bold text-[#1B1B1A]">
                              {emp.fullName}
                            </div>
                            <div className="text-xs text-[#4A4A47] flex items-center gap-1">
                              <span className="font-mono">{emp.employeeCode}</span>
                              <span>•</span>
                              <span>{emp.designation}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
                            emp.role === "SYSAD"
                              ? "bg-purple-100 text-purple-800"
                              : emp.role === "ADMIN"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {emp.role === "SYSAD"
                            ? "SysAd"
                            : emp.role === "ADMIN"
                            ? "Admin"
                            : "User"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#1B1B1A]">
                        <span className="font-medium">{assignedShift?.name || "Opening"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={emp.allowOffsiteTimeout}
                            onChange={() => onToggleEmployeeModeC(emp.id)}
                            aria-label={`Allow off-site Time Out for ${emp.fullName}`}
                            className="w-6 h-6 rounded cursor-pointer accent-[#1B1B1A]"
                          />
                          <span className="text-xs font-medium text-[#4A4A47]">
                            {emp.allowOffsiteTimeout ? "Mode C Active" : "Store only"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingEmployee(emp)}
                          className="h-8 px-3 border border-[#6B6B67] rounded-lg bg-white text-xs font-semibold text-[#1B1B1A] hover:bg-slate-100 transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Shift Modal */}
      {editingShift && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-[#1B1B1A]">
                Edit Shift · {editingShift.name}
              </h2>
              <button
                onClick={() => setEditingShift(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveShiftEdit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Shift Name
                </label>
                <input
                  type="text"
                  value={editingShift.name}
                  onChange={(e) =>
                    setEditingShift({ ...editingShift, name: e.target.value })
                  }
                  required
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={editingShift.startTime}
                    onChange={(e) =>
                      setEditingShift({ ...editingShift, startTime: e.target.value })
                    }
                    required
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={editingShift.endTime}
                    onChange={(e) =>
                      setEditingShift({ ...editingShift, endTime: e.target.value })
                    }
                    required
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Grace Period (Minutes)
                </label>
                <select
                  value={editingShift.gracePeriodMins}
                  onChange={(e) =>
                    setEditingShift({
                      ...editingShift,
                      gracePeriodMins: Number(e.target.value),
                    })
                  }
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm font-medium"
                >
                  <option value={0}>0 minutes (Strict / No grace)</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes (PRD Default)</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingShift(null)}
                  className="h-10 px-4 rounded-lg border border-slate-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-lg bg-[#1B1B1A] text-white text-sm font-bold shadow-xs hover:bg-black"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Shift Template Modal */}
      {showAddShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-[#1B1B1A]">
                Add Shift Template
              </h2>
              <button
                onClick={() => setShowAddShiftModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateShift} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Shift Template Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Weekend Peak Surge"
                  value={newShiftName}
                  onChange={(e) => setNewShiftName(e.target.value)}
                  required
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newShiftStart}
                    onChange={(e) => setNewShiftStart(e.target.value)}
                    required
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newShiftEnd}
                    onChange={(e) => setNewShiftEnd(e.target.value)}
                    required
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Grace Period (Minutes)
                </label>
                <select
                  value={newShiftGrace}
                  onChange={(e) => setNewShiftGrace(Number(e.target.value))}
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm font-medium"
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddShiftModal(false)}
                  className="h-10 px-4 rounded-lg border border-slate-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-lg bg-[#1B1B1A] text-white text-sm font-bold shadow-xs hover:bg-black"
                >
                  Create Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-[#1B1B1A]">
                Edit Employee Details
              </h2>
              <button
                onClick={() => setEditingEmployee(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEmployeeEdit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editingEmployee.fullName}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, fullName: e.target.value })
                  }
                  required
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  value={editingEmployee.designation}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, designation: e.target.value })
                  }
                  required
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    System Role
                  </label>
                  <select
                    value={editingEmployee.role}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        role: e.target.value as AccessRole,
                      })
                    }
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="USER">User (Employee)</option>
                    <option value="ADMIN">Branch Admin</option>
                    <option value="SYSAD">System Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Default Shift
                  </label>
                  <select
                    value={editingEmployee.shiftId}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        shiftId: e.target.value,
                      })
                    }
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm"
                  >
                    {branchShifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    Mode C Off-Site Time Out
                  </div>
                  <div className="text-xs text-slate-500">
                    Allow clocking out off-site with selfie for errands
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={editingEmployee.allowOffsiteTimeout}
                  onChange={(e) =>
                    setEditingEmployee({
                      ...editingEmployee,
                      allowOffsiteTimeout: e.target.checked,
                    })
                  }
                  className="w-6 h-6 rounded cursor-pointer accent-[#1B1B1A]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="h-10 px-4 rounded-lg border border-slate-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-lg bg-[#1B1B1A] text-white text-sm font-bold shadow-xs hover:bg-black"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
