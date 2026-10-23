"use client";

import React, { useState } from "react";
import {
  AccessRole,
  AttendanceLog,
  Branch,
  Employee,
} from "@/types/attendance";

interface PayrollExportCenterProps {
  role: AccessRole;
  branches: Branch[];
  employees: Employee[];
  logs: AttendanceLog[];
}

interface PayrollSummaryRow {
  code: string;
  name: string;
  branchId: string;
  branchName: string;
  daysPresent: number;
  totalHours: number;
  lateMin: number;
  undertimeMin: number;
  incompleteDays: number;
}

export default function PayrollExportCenter({
  role,
  branches,
  employees,
  logs,
}: PayrollExportCenterProps) {
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [periodStart, setPeriodStart] = useState<string>("2024-10-01");
  const [periodEnd, setPeriodEnd] = useState<string>("2024-10-15");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Compute live payroll summary rows
  const summaryRows: PayrollSummaryRow[] = employees
    .filter((emp) => selectedBranch === "ALL" || emp.branchId === selectedBranch)
    .map((emp) => {
      // Find logs for this employee
      const empLogs = logs.filter((l) => l.employeeId === emp.id);

      // Days present (seeded + live)
      const baseDays = emp.daysPresent ?? 11;
      const daysPresent = baseDays + (empLogs.length > 0 ? 1 : 0);

      // Incomplete days (punches missing Time Out)
      const incompleteCount = empLogs.filter((l) => l.timeInAt && !l.timeOutAt).length;

      // Late minutes
      const liveLate = empLogs.reduce((acc, l) => acc + (l.lateMinutes || 0), 0);
      const seededLate = emp.id === "emp-liza" ? 24 : emp.id === "emp-marco" ? 5 : 0;
      const lateMin = liveLate + seededLate;

      // Undertime minutes
      const liveUndertime = empLogs.reduce((acc, l) => acc + (l.undertimeMinutes || 0), 0);
      const seededUndertime = emp.id === "emp-sarah" ? 35 : 0;
      const undertimeMin = liveUndertime + seededUndertime;

      // Total hours: standard 8h/day minus late/undertime
      const baseHours = emp.regularHours ?? daysPresent * 8.0;
      const deductionHours = (lateMin + undertimeMin) / 60;
      const totalHours = Math.max(0, Math.round((baseHours - deductionHours) * 10) / 10);

      const branch = branches.find((b) => b.id === emp.branchId);

      return {
        code: emp.employeeCode,
        name: emp.fullName,
        branchId: emp.branchId,
        branchName: branch?.name || "Main Store",
        daysPresent,
        totalHours,
        lateMin,
        undertimeMin,
        incompleteDays: incompleteCount,
      };
    });

  // Calculate totals
  const totalDays = summaryRows.reduce((acc, r) => acc + r.daysPresent, 0);
  const totalHoursSum = summaryRows.reduce((acc, r) => acc + r.totalHours, 0);
  const totalLateSum = summaryRows.reduce((acc, r) => acc + r.lateMin, 0);
  const totalUndertimeSum = summaryRows.reduce((acc, r) => acc + r.undertimeMin, 0);
  const totalIncompleteSum = summaryRows.reduce((acc, r) => acc + r.incompleteDays, 0);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "Code",
      "Employee",
      "Branch",
      "PeriodStart",
      "PeriodEnd",
      "DaysPresent",
      "TotalHours",
      "LateMin",
      "UndertimeMin",
      "IncompleteDays",
    ];

    const rows = summaryRows.map((r) => [
      r.code,
      `"${r.name}"`,
      `"${r.branchName}"`,
      periodStart,
      periodEnd,
      r.daysPresent,
      r.totalHours.toFixed(1),
      r.lateMin,
      r.undertimeMin,
      r.incompleteDays,
    ]);

    // Prepend UTF-8 BOM so Excel opens it with proper encoding
    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `JATS_Payroll_${selectedBranch}_${periodStart}_to_${periodEnd}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice(
      `CSV successfully downloaded (${summaryRows.length} employee records). Compatible with POS & payroll imports.`
    );
    setTimeout(() => setExportNotice(null), 4000);
  };

  // Export Excel (SpreadsheetML / XML format)
  const handleExportExcel = () => {
    const xmlHeader = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1B1B1A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Data"/>
 </Styles>
 <Worksheet ss:Name="Payroll Export">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Code</Data></Cell>
    <Cell><Data ss:Type="String">Employee</Data></Cell>
    <Cell><Data ss:Type="String">Branch</Data></Cell>
    <Cell><Data ss:Type="String">Days Present</Data></Cell>
    <Cell><Data ss:Type="String">Total Hours</Data></Cell>
    <Cell><Data ss:Type="String">Late (min)</Data></Cell>
    <Cell><Data ss:Type="String">Undertime (min)</Data></Cell>
    <Cell><Data ss:Type="String">Incomplete Days</Data></Cell>
   </Row>`;

    const xmlRows = summaryRows
      .map(
        (r) => `   <Row ss:StyleID="Data">
    <Cell><Data ss:Type="String">${r.code}</Data></Cell>
    <Cell><Data ss:Type="String">${r.name}</Data></Cell>
    <Cell><Data ss:Type="String">${r.branchName}</Data></Cell>
    <Cell><Data ss:Type="Number">${r.daysPresent}</Data></Cell>
    <Cell><Data ss:Type="Number">${r.totalHours.toFixed(1)}</Data></Cell>
    <Cell><Data ss:Type="Number">${r.lateMin}</Data></Cell>
    <Cell><Data ss:Type="Number">${r.undertimeMin}</Data></Cell>
    <Cell><Data ss:Type="Number">${r.incompleteDays}</Data></Cell>
   </Row>`
      )
      .join("\n");

    const xmlFooter = `  </Table>
 </Worksheet>
</Workbook>`;

    const fullXml = xmlHeader + "\n" + xmlRows + "\n" + xmlFooter;
    const blob = new Blob([fullXml], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `JATS_Payroll_${selectedBranch}_${periodStart}_to_${periodEnd}.xls`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice(
      `Excel sheet successfully exported (${summaryRows.length} employee records).`
    );
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-[28px] font-bold text-[#1B1B1A] tracking-tight">
          Payroll export
        </h1>
        <div className="text-xs font-mono text-[#4A4A47] bg-slate-100 px-3 py-1.5 rounded-lg">
          Philippine Labor Standard (DOLE) • Net Payable Hours
        </div>
      </div>

      {exportNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-600 text-[20px]">
            check_circle
          </span>
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Filter Card matching Wireframe 06 */}
      <div className="bg-white border border-[#C9C9C4] rounded-xl p-4 flex gap-4 items-end flex-wrap shadow-xs">
        <label className="text-[14px] font-semibold text-[#1B1B1A]">
          Branch
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="block h-10 px-3 mt-1 bg-white border border-[#C9C9C4] rounded-lg text-sm font-semibold text-[#1B1B1A] focus:outline-none min-w-[180px]"
          >
            <option value="ALL">All 3 branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-[14px] font-semibold text-[#1B1B1A]">
          Period start
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="block h-10 px-3 mt-1 border border-[#C9C9C4] rounded-lg text-sm font-mono text-[#1B1B1A] focus:outline-none"
          />
        </label>

        <label className="text-[14px] font-semibold text-[#1B1B1A]">
          Period end
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="block h-10 px-3 mt-1 border border-[#C9C9C4] rounded-lg text-sm font-mono text-[#1B1B1A] focus:outline-none"
          />
        </label>

        <button
          type="button"
          onClick={() => {
            setExportNotice("Ledger preview refreshed with latest attendance punches.");
            setTimeout(() => setExportNotice(null), 3000);
          }}
          className="h-10 px-5 bg-[#1B1B1A] text-white border border-[#1B1B1A] rounded-lg text-sm font-semibold hover:bg-black transition-colors shadow-xs"
        >
          Preview
        </button>
      </div>

      {/* Table Card matching Wireframe 06 */}
      <div className="bg-white border border-[#C9C9C4] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[15px]">
            <thead>
              <tr className="border-b border-[#C9C9C4] text-left bg-slate-50/60">
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Code
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Employee
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Days present
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Total hours
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Late (min)
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Undertime (min)
                </th>
                <th className="py-3 px-4 text-[13px] font-bold text-[#4A4A47] uppercase tracking-wider">
                  Incomplete days
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E3DF]">
              {summaryRows.map((row) => (
                <tr key={row.code} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono text-sm font-bold text-[#1B1B1A]">
                    {row.code}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#1B1B1A]">
                    <div>{row.name}</div>
                    <div className="text-xs text-[#4A4A47] font-normal">
                      {row.branchName}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[#1B1B1A]">
                    {row.daysPresent}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-[#1B1B1A]">
                    {row.totalHours.toFixed(1)}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {row.lateMin > 0 ? (
                      <span className="text-red-600 font-bold">{row.lateMin}</span>
                    ) : (
                      <span className="text-[#1B1B1A]">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {row.undertimeMin > 0 ? (
                      <span className="text-amber-700 font-bold">{row.undertimeMin}</span>
                    ) : (
                      <span className="text-[#1B1B1A]">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {row.incompleteDays > 0 ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {row.incompleteDays}
                      </span>
                    ) : (
                      <span className="text-[#1B1B1A]">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/80 font-bold border-t-2 border-[#C9C9C4] text-[14px]">
                <td className="py-3 px-4" colSpan={2}>
                  Total ({summaryRows.length} Employees)
                </td>
                <td className="py-3 px-4 font-mono">{totalDays}</td>
                <td className="py-3 px-4 font-mono text-[#1B1B1A]">
                  {totalHoursSum.toFixed(1)} hrs
                </td>
                <td className="py-3 px-4 font-mono text-red-600">
                  {totalLateSum} min
                </td>
                <td className="py-3 px-4 font-mono text-amber-700">
                  {totalUndertimeSum} min
                </td>
                <td className="py-3 px-4 font-mono">
                  {totalIncompleteSum}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Export Buttons matching Wireframe 06 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleExportCsv}
          className="h-10 px-5 bg-[#1B1B1A] text-white border border-[#1B1B1A] rounded-lg text-sm font-semibold hover:bg-black transition-colors shadow-xs flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">
            download
          </span>
          <span>Export CSV</span>
        </button>

        <button
          type="button"
          onClick={handleExportExcel}
          className="h-10 px-5 bg-white text-[#1B1B1A] border border-[#6B6B67] rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors shadow-xs flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">
            table_view
          </span>
          <span>Export Excel</span>
        </button>
      </div>
    </div>
  );
}
