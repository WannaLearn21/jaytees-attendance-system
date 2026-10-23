"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AttendanceLog,
  Branch,
  Employee,
  GpsPosition,
  ShiftTemplate,
} from "@/types/attendance";
import {
  calculateLateMinutes,
  calculateUndertimeAndHours,
  evaluateVicinityAndModeC,
  formatTime12h,
} from "@/lib/geo";

interface MobilePunchStationProps {
  employee: Employee;
  employees: Employee[];
  branches: Branch[];
  shifts: ShiftTemplate[];
  logs: AttendanceLog[];
  currentGps: GpsPosition;
  currentTime: Date;
  onSelectEmployee: (empId: string) => void;
  onSimulateGpsBranch: (branch: Branch) => void;
  onSimulateGpsOutside: () => void;
  onRequestRealGps: () => void;
  onRecordTimeIn: (newLog: AttendanceLog) => void;
  onRecordTimeOut: (updatedLog: AttendanceLog) => void;
}

const ZOOM_LEVELS = [
  { scale: 0.92, label: "90%" },
  { scale: 1.0, label: "100%" },
  { scale: 1.12, label: "115%" },
  { scale: 1.22, label: "125%" },
];

export function MobilePunchStation({
  employee,
  employees,
  branches,
  shifts,
  logs,
  currentGps,
  currentTime,
  onSelectEmployee,
  onSimulateGpsBranch,
  onSimulateGpsOutside,
  onRequestRealGps,
  onRecordTimeIn,
  onRecordTimeOut,
}: MobilePunchStationProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [punchMode, setPunchMode] = useState<"store" | "field">("store");
  const [fieldNote, setFieldNote] = useState("");
  const [zoomIdx, setZoomIdx] = useState(1);
  const [mobileTab, setMobileTab] = useState<"station" | "history" | "shift">(
    "station"
  );
  const [modalState, setModalState] = useState<{
    open: boolean;
    isError: boolean;
    title: string;
    details: string;
    locationLabel: string;
    hash: string;
  } | null>(null);

  const startWebcam = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (
        typeof navigator !== "undefined" &&
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia
      ) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setWebcamActive(true);
      }
    } catch {
      setWebcamActive(false);
    }
  };

  useEffect(() => {
    startWebcam();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const vicinity = evaluateVicinityAndModeC(
    currentGps.latitude,
    currentGps.longitude,
    employee,
    branches
  );

  const assignedShift =
    shifts.find((s) => s.id === employee.shiftId) || shifts[0];

  const todayKey = currentTime.toISOString().slice(0, 10);
  const myLogs = logs.filter((l) => l.employeeId === employee.id);
  const todayLog = myLogs.find((l) => l.dateKey === todayKey);

  // Format PST clock parts
  const timeParts = currentTime
    .toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    .split(" ");
  const clockDigits = timeParts[0] || "07:48:22";
  const clockAmPm = timeParts[1] || "AM";

  const captureWatermarkedCanvas = (actionLabel: "TIME IN" | "TIME OUT") => {
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return employee.avatarUrl;

    if (
      webcamActive &&
      videoRef.current &&
      videoRef.current.readyState >= 2
    ) {
      ctx.save();
      ctx.translate(480, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, 480, 360);
      ctx.restore();
    } else {
      return employee.avatarUrl;
    }

    ctx.fillStyle = "rgba(19, 27, 46, 0.85)";
    ctx.fillRect(0, 280, 480, 80);
    ctx.fillStyle = "#fe932c";
    ctx.font = "bold 13px monospace";
    ctx.fillText(
      `${actionLabel} • ${employee.employeeCode} • ${employee.fullName}`,
      14,
      305
    );
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    ctx.fillText(
      `${vicinity.targetBranch.name} (${vicinity.distanceMeters}m) • ${clockDigits} ${clockAmPm}`,
      14,
      330
    );
    ctx.fillStyle = "#97f5cc";
    ctx.font = "11px monospace";
    ctx.fillText(
      `${currentGps.latitude.toFixed(4)}° N, ${currentGps.longitude.toFixed(
        4
      )}° E`,
      14,
      350
    );

    return canvas.toDataURL("image/webp", 0.68);
  };

  const handleTriggerPunch = (type: "IN" | "OUT") => {
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const hash = `#JTS-${Math.floor(1000 + Math.random() * 9000)}-OK`;

    if (type === "IN") {
      if (!vicinity.canTimeIn) {
        setModalState({
          open: true,
          isError: true,
          title: "Outside Branch Geofence",
          details: `You are ${vicinity.distanceMeters}m away from ${vicinity.targetBranch.name}. Step inside the ${vicinity.allowedRadiusMeters}m radius to Time In.`,
          locationLabel: `Outside (${vicinity.distanceMeters}m)`,
          hash: "#JTS-BLOCKED-GEO",
        });
        return;
      }

      const photo = captureWatermarkedCanvas("TIME IN");
      const lateMins = calculateLateMinutes(
        now.toISOString(),
        assignedShift.startTime,
        assignedShift.gracePeriodMins
      );

      const newLog: AttendanceLog = {
        id: `log-${Date.now()}`,
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        employeeName: employee.fullName,
        branchId: vicinity.targetBranch.id,
        branchName: vicinity.targetBranch.name,
        shiftName: `${assignedShift.name} (${assignedShift.startTime} - ${assignedShift.endTime})`,
        shiftStart: assignedShift.startTime,
        shiftEnd: assignedShift.endTime,
        dateKey: todayKey,
        timeInAt: now.toISOString(),
        timeInLat: currentGps.latitude,
        timeInLng: currentGps.longitude,
        timeInDistanceM: vicinity.distanceMeters,
        timeInPhotoData: photo,
        lateMinutes: lateMins,
        isOffsiteTimeout: false,
        undertimeMinutes: 0,
        totalHours: 0,
        statusFlag: "IN_GEOFENCE",
        reviewedByAdmin: true,
      };

      onRecordTimeIn(newLog);
      setModalState({
        open: true,
        isError: false,
        title: "Time-In Confirmed!",
        details: `${employee.fullName} • ${timeFormatted} PST`,
        locationLabel: `${vicinity.targetBranch.shortName} Store (${vicinity.distanceMeters}m)`,
        hash,
      });
    } else {
      // TIME OUT (Mode C Logic)
      if (!vicinity.canTimeOut) {
        setModalState({
          open: true,
          isError: true,
          title: "Time-Out Blocked (Mode C Policy)",
          details: `${employee.fullName} is assigned to Standard In-Store Policy and must be within ${vicinity.allowedRadiusMeters}m of ${vicinity.targetBranch.name} to Time Out.`,
          locationLabel: `Off-Site Blocked (${vicinity.distanceMeters}m)`,
          hash: "#JTS-MODEC-STRICT",
        });
        return;
      }

      const photo = captureWatermarkedCanvas("TIME OUT");
      if (todayLog) {
        const { undertimeMinutes, totalHours } = calculateUndertimeAndHours(
          todayLog.timeInAt,
          now.toISOString(),
          todayLog.shiftEnd
        );
        const isOffsite = !vicinity.isInsideVicinity || punchMode === "field";
        const updated: AttendanceLog = {
          ...todayLog,
          timeOutAt: now.toISOString(),
          timeOutLat: currentGps.latitude,
          timeOutLng: currentGps.longitude,
          timeOutDistanceM: vicinity.distanceMeters,
          timeOutPhotoData: photo,
          isOffsiteTimeout: isOffsite,
          offsiteNote: isOffsite
            ? fieldNote.trim() || "Mode C Authorized Field Delivery"
            : undefined,
          undertimeMinutes,
          totalHours,
          statusFlag: isOffsite ? "MODE_C_APPROVED" : "IN_GEOFENCE",
        };
        onRecordTimeOut(updated);
      } else {
        // Create standalone Time-Out log if testing Time-Out directly
        const isOffsite = !vicinity.isInsideVicinity || punchMode === "field";
        const newLog: AttendanceLog = {
          id: `log-${Date.now()}`,
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          employeeName: employee.fullName,
          branchId: vicinity.targetBranch.id,
          branchName: vicinity.targetBranch.name,
          shiftName: assignedShift.name,
          shiftStart: assignedShift.startTime,
          shiftEnd: assignedShift.endTime,
          dateKey: todayKey,
          timeInAt: new Date(now.getTime() - 8 * 3600000).toISOString(),
          timeInLat: vicinity.targetBranch.latitude,
          timeInLng: vicinity.targetBranch.longitude,
          timeInDistanceM: 22,
          timeInPhotoData: employee.avatarUrl,
          lateMinutes: 0,
          timeOutAt: now.toISOString(),
          timeOutLat: currentGps.latitude,
          timeOutLng: currentGps.longitude,
          timeOutDistanceM: vicinity.distanceMeters,
          timeOutPhotoData: photo,
          isOffsiteTimeout: isOffsite,
          offsiteNote: isOffsite
            ? fieldNote.trim() || "Mode C Authorized Field Delivery"
            : undefined,
          undertimeMinutes: 0,
          totalHours: 8.0,
          statusFlag: isOffsite ? "MODE_C_APPROVED" : "IN_GEOFENCE",
          reviewedByAdmin: true,
        };
        onRecordTimeIn(newLog);
      }

      setModalState({
        open: true,
        isError: false,
        title: "Time-Out Recorded!",
        details: `${employee.fullName} • ${timeFormatted} PST`,
        locationLabel: vicinity.isInsideVicinity
          ? `${vicinity.targetBranch.shortName} Store (${vicinity.distanceMeters}m)`
          : `Mode C Off-Site (${vicinity.distanceMeters}m)`,
        hash,
      });
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Simulator Control Bar above the Mobile Frame */}
      <div className="w-full max-w-4xl bg-surface-container-lowest rounded-xl p-space-md shadow-sm mb-space-md border border-slate-200/80 flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm flex-wrap">
          <span className="font-label-sm text-label-sm uppercase text-primary-container font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">
              smartphone
            </span>
            Active Staff Phone:
          </span>
          <select
            value={employee.id}
            onChange={(e) => onSelectEmployee(e.target.value)}
            className="h-9 px-3 rounded-lg bg-surface-container-low font-label-md text-label-md text-on-surface border border-slate-200 focus:outline-none"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.employeeCode} • {emp.fullName}{" "}
                {emp.allowOffsiteTimeout
                  ? "(Mode C Off-Site OK)"
                  : "(In-Store Strict)"}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Simulate GPS:
          </span>
          {branches.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onSimulateGpsBranch(b)}
              className="px-2.5 py-1 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm hover:opacity-90 transition"
            >
              📍 {b.shortName}
            </button>
          ))}
          <button
            type="button"
            onClick={onSimulateGpsOutside}
            className="px-2.5 py-1 rounded-lg bg-error-container text-on-error-container font-label-sm text-label-sm hover:opacity-90 transition"
          >
            🚚 Off-Site (1.4km)
          </button>
          <button
            type="button"
            onClick={onRequestRealGps}
            className="px-2.5 py-1 rounded-lg bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm hover:opacity-90 transition"
          >
            📡 Real GPS
          </button>
        </div>
      </div>

      {/* Stitch Senior-Friendly Mobile Punch Station Shell */}
      <div className="w-full max-w-[440px] bg-surface rounded-3xl border-[6px] border-on-surface/90 shadow-2xl overflow-hidden flex flex-col relative">
        {/* Mobile App Header */}
        <header className="bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] px-gutter-mobile h-20 flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center text-on-primary font-headline-md text-headline-md tracking-tight shadow-md">
              J
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight leading-none font-bold">
                Jaytees
              </span>
              <span className="font-label-sm text-label-sm text-secondary uppercase leading-tight mt-0.5">
                JATS v1.1 • PST
              </span>
            </div>
          </div>

          <div className="flex items-center gap-space-sm">
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-surface-container-low shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
              <span
                className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  vicinity.isInsideVicinity
                    ? "bg-tertiary-container"
                    : "bg-secondary-container"
                }`}
              ></span>
              <span className="font-label-sm text-label-sm text-tertiary">
                GPS Active
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">
                person
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Content Body with Senior Zoom Scaling */}
        <div
          className="flex flex-col w-full px-gutter-mobile pt-3 pb-6 space-y-space-md transition-all"
          style={{
            zoom: ZOOM_LEVELS[zoomIdx].scale,
          }}
        >
          {mobileTab === "station" && (
            <>
              {/* 1. LIVE TIME & SHIFT BANNER */}
              <div className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-md flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-secondary-container via-primary-container to-secondary-container"></div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-ping"></span>
                  <span className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider">
                    Philippine Standard Time (PST)
                  </span>
                </div>
                <div className="flex items-baseline justify-center text-primary-container font-headline-xl text-headline-xl font-bold tracking-tight py-0.5">
                  {clockDigits}{" "}
                  <span className="text-headline-md font-semibold text-secondary ml-1.5">
                    {clockAmPm}
                  </span>
                </div>
                <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {currentTime.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div className="mt-2.5 w-full bg-surface-container-low rounded-lg p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[22px]">
                      wb_twilight
                    </span>
                    <div className="text-left">
                      <p className="font-label-md text-label-md text-on-surface font-bold leading-tight">
                        {assignedShift.name}
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {formatTime12h(assignedShift.startTime)} –{" "}
                        {formatTime12h(assignedShift.endTime)}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      check_circle
                    </span>{" "}
                    On Schedule
                  </span>
                </div>
              </div>

              {/* 2. LARGE SENIOR PROFILE CARD */}
              <div className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center gap-space-md">
                <div className="relative flex-shrink-0">
                  <img
                    className="w-16 h-16 rounded-xl object-cover shadow-sm bg-surface-container"
                    alt={employee.fullName}
                    src={employee.avatarUrl}
                  />
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary text-[10px]">
                    <span className="material-symbols-outlined text-[13px]">
                      verified
                    </span>
                  </span>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-headline-md text-headline-md font-bold text-on-surface truncate">
                      {employee.fullName}
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant font-medium">
                    {employee.designation}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold">
                      ID: {employee.employeeCode}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">
                        storefront
                      </span>{" "}
                      {vicinity.targetBranch.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. REAL-TIME GPS & LOCATION SENTINEL */}
              <div className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full animate-pulse ${
                        vicinity.isInsideVicinity
                          ? "bg-tertiary-container shadow-[0_0_10px_rgba(0,90,64,0.6)]"
                          : "bg-primary-container shadow-[0_0_10px_rgba(153,27,27,0.6)]"
                      }`}
                    ></div>
                    <span
                      className={`font-headline-sm text-headline-sm font-bold ${
                        vicinity.isInsideVicinity
                          ? "text-tertiary"
                          : "text-primary-container"
                      }`}
                    >
                      {vicinity.isInsideVicinity
                        ? "INSIDE GEOFENCE"
                        : "OUTSIDE GEOFENCE"}
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-tertiary-container px-2 py-0.5 rounded-full bg-tertiary-fixed font-bold">
                    {vicinity.allowedRadiusMeters}m Radius Zone
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-surface-container-low rounded-lg p-2.5 flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary text-[24px]">
                      radar
                    </span>
                    <div className="min-w-0">
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        Store Proximity
                      </p>
                      <p className="font-body-md text-body-md font-bold text-on-surface truncate">
                        {vicinity.distanceMeters}m to Terminal
                      </p>
                    </div>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-2.5 flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[24px]">
                      my_location
                    </span>
                    <div className="min-w-0">
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        GPS Precision
                      </p>
                      <p className="font-body-md text-body-md font-bold text-on-surface truncate">
                        ±4.2m Accurate
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. LIVE CAMERA SELFIE VIEWFINDER FRAME */}
              <div className="w-full bg-surface-container-lowest rounded-xl p-space-sm shadow-md flex flex-col">
                <div className="flex items-center justify-between px-space-xs py-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary-container text-[18px]">
                      photo_camera
                    </span>
                    <span className="font-label-md text-label-md font-bold text-on-surface">
                      Face Verification Viewfinder
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                    Front Camera Active • 35KB
                  </span>
                </div>

                <div className="relative w-full h-[220px] rounded-lg overflow-hidden bg-on-surface flex items-center justify-center shadow-inner">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] ${
                      webcamActive ? "block" : "hidden"
                    }`}
                  />
                  {!webcamActive && (
                    <img
                      className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                      alt={employee.fullName}
                      src={employee.avatarUrl}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-transparent to-on-surface/40 pointer-events-none"></div>

                  {/* Friendly Face Oval Guide Overlay */}
                  <div className="relative z-10 w-36 h-44 rounded-[50%] border-2 border-dashed border-white/70 flex flex-col items-center justify-center p-2 text-center pointer-events-none bg-surface-container-lowest/10">
                    <span className="material-symbols-outlined text-surface-bright text-[32px] opacity-90 drop-shadow">
                      face
                    </span>
                    <p className="font-label-sm text-label-sm text-surface-bright font-bold mt-1 px-1.5 py-0.5 drop-shadow bg-on-surface/60 rounded">
                      Fit face inside
                    </p>
                  </div>

                  {/* Watermark Timestamp & Geocoords Overlay */}
                  <div className="absolute bottom-2 left-2 z-20 flex flex-col text-surface-bright drop-shadow pointer-events-none">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-secondary-container">
                        schedule
                      </span>
                      <span className="font-data-mono text-data-mono font-bold leading-tight">
                        {clockDigits.slice(0, 5)} {clockAmPm} PST
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[13px] text-tertiary-fixed">
                        location_on
                      </span>
                      <span className="font-data-mono text-[11px] leading-tight opacity-95">
                        {currentGps.latitude.toFixed(4)}° N,{" "}
                        {currentGps.longitude.toFixed(4)}° E
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={startWebcam}
                    aria-label="Switch or retake camera"
                    className="absolute top-2 right-2 z-20 w-10 h-10 rounded-full bg-surface-container-lowest/85 backdrop-blur text-on-surface flex items-center justify-center shadow active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[22px]">
                      cameraswitch
                    </span>
                  </button>
                </div>
              </div>

              {/* 5. MODE C: OPERATIONAL STATUS & PUNCH TYPE SELECTOR */}
              <div className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                      <span className="material-symbols-outlined text-[18px]">
                        verified_user
                      </span>
                    </div>
                    <div>
                      <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                        Mode C Authorization
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {employee.allowOffsiteTimeout
                          ? "Field & Special Operation Punch Active"
                          : "Standard In-Store Geofence Enforced"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded font-label-sm text-label-sm font-bold uppercase ${
                      employee.allowOffsiteTimeout
                        ? "bg-secondary-container text-on-secondary-container"
                        : "bg-surface-container-high text-on-surface"
                    }`}
                  >
                    {employee.allowOffsiteTimeout ? "Verified" : "In-Store"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-surface-container-low p-1.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPunchMode("store")}
                    className={`py-2.5 px-2 rounded-md font-label-lg text-label-lg font-bold text-center transition-all ${
                      punchMode === "store"
                        ? "bg-surface-container-lowest text-primary shadow-sm"
                        : "text-on-surface-variant hover:bg-surface-container-lowest/60"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] align-middle mr-1">
                      store
                    </span>
                    In-Store
                  </button>
                  <button
                    type="button"
                    onClick={() => setPunchMode("field")}
                    className={`py-2.5 px-2 rounded-md font-label-lg text-label-lg font-bold text-center transition-all ${
                      punchMode === "field"
                        ? "bg-surface-container-lowest text-secondary shadow-sm"
                        : "text-on-surface-variant hover:bg-surface-container-lowest/60"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] align-middle mr-1">
                      local_shipping
                    </span>
                    Off-Site Delivery
                  </button>
                </div>

                {(punchMode === "field" || !vicinity.isInsideVicinity) && (
                  <div className="w-full space-y-1">
                    <label className="font-label-md text-label-md text-on-surface font-semibold">
                      Off-Site Destination Note (Optional):
                    </label>
                    <input
                      type="text"
                      value={fieldNote}
                      onChange={(e) => setFieldNote(e.target.value)}
                      placeholder="e.g. San Miguel Coffee Bean Supplier Depot"
                      className="w-full h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* 6. TWO HUGE SENIOR-FRIENDLY ACTION BUTTONS (Touch Targets > 68px) */}
              <div className="w-full flex flex-col space-y-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleTriggerPunch("IN")}
                  className="w-full min-h-[76px] py-3.5 px-4 rounded-xl bg-primary-container text-on-primary flex items-center justify-between shadow-lg active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-13 h-13 min-w-[52px] min-h-[52px] rounded-lg bg-surface-container-lowest/15 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[36px] text-on-primary">
                        login
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="font-headline-lg text-headline-lg font-bold tracking-tight block leading-tight">
                        TIME IN
                      </span>
                      <span className="font-body-sm text-body-sm text-on-primary-container block mt-0.5">
                        Capture selfie &amp; register shift start
                      </span>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-surface-container-lowest/20 flex items-center justify-center flex-shrink-0 ml-2">
                    <span className="material-symbols-outlined text-[24px] text-on-primary">
                      arrow_forward
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerPunch("OUT")}
                  className="w-full min-h-[68px] py-3 px-4 rounded-xl bg-surface-container-lowest text-on-surface flex items-center justify-between shadow-sm border border-slate-200 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container">
                      <span className="material-symbols-outlined text-[32px]">
                        logout
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="font-headline-md text-headline-md font-bold text-on-surface block leading-tight">
                        TIME OUT
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant block mt-0.5">
                        Shift completion &amp; punch-out
                      </span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center flex-shrink-0 ml-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px]">
                      chevron_right
                    </span>
                  </div>
                </button>
              </div>

              {/* 7. TODAY'S PUNCH STATE CARD */}
              <div className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
                <div className="flex items-center justify-between pb-2">
                  <span className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wide">
                    Today&apos;s Attendance Status
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold">
                    Synced JATS Cloud
                  </span>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed flex-shrink-0">
                    <span className="material-symbols-outlined text-[22px]">
                      history_toggle_off
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-label-lg text-label-lg font-bold text-on-surface">
                      {todayLog
                        ? todayLog.timeOutAt
                          ? `Completed Shift (${todayLog.totalHours} hrs)`
                          : `Timed In at ${new Date(
                              todayLog.timeInAt
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                        : "Morning Time-In: Not Yet Punched"}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      {todayLog
                        ? `${todayLog.branchName} (${todayLog.timeInDistanceM}m)`
                        : "Tap TIME IN above while inside branch geofence"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 8. SENIOR ACCESSIBILITY ASSISTANCE FOOTER */}
              <div className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md text-on-surface-variant font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      accessibility_new
                    </span>
                    Senior Assistance Tools
                  </span>
                  <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() =>
                        setZoomIdx((prev) => Math.max(0, prev - 1))
                      }
                      className="w-8 h-8 rounded bg-surface-container-lowest text-on-surface font-bold text-base flex items-center justify-center shadow-xs"
                    >
                      A-
                    </button>
                    <span className="font-label-sm text-label-sm px-1.5 text-on-surface font-bold">
                      {ZOOM_LEVELS[zoomIdx].label}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setZoomIdx((prev) =>
                          Math.min(ZOOM_LEVELS.length - 1, prev + 1)
                        )
                      }
                      className="w-8 h-8 rounded bg-surface-container-lowest text-on-surface font-bold text-base flex items-center justify-center shadow-xs"
                    >
                      A+
                    </button>
                  </div>
                </div>
                <a
                  className="w-full min-h-[48px] py-2.5 px-3 rounded-lg bg-surface-container-low text-on-surface flex items-center justify-center gap-2 font-label-lg text-label-lg font-bold"
                  href="tel:09171234567"
                >
                  <span className="material-symbols-outlined text-secondary text-[22px]">
                    phone_in_talk
                  </span>
                  Need Help? Call Shift Supervisor (Mgr. Elena)
                </a>
              </div>
            </>
          )}

          {mobileTab === "history" && (
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-3">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                My Attendance Logs ({myLogs.length})
              </h3>
              {myLogs.length === 0 ? (
                <p className="font-body-sm text-body-sm text-on-surface-variant py-6 text-center">
                  No logs recorded yet for {employee.fullName}.
                </p>
              ) : (
                myLogs.map((l) => (
                  <div
                    key={l.id}
                    className="p-3 rounded-lg bg-surface-container-low flex items-center gap-3"
                  >
                    <img
                      src={l.timeOutPhotoData || l.timeInPhotoData}
                      alt="Selfie"
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-label-md text-label-md font-bold text-on-surface">
                        {l.dateKey} • {l.branchName}
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        In:{" "}
                        {new Date(l.timeInAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        ({l.timeInDistanceM}m)
                        {l.timeOutAt
                          ? ` • Out: ${new Date(
                              l.timeOutAt
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {mobileTab === "shift" && (
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-3">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Assigned Shift &amp; Mode C Policy
              </h3>
              <div className="p-3 rounded-lg bg-surface-container-low space-y-1.5 font-body-sm text-body-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Shift Slot:</span>
                  <span className="font-bold text-on-surface">
                    {assignedShift.name} ({assignedShift.startTime} –{" "}
                    {assignedShift.endTime})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Grace Window:</span>
                  <span className="font-bold text-secondary">
                    {assignedShift.gracePeriodMins} Minutes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">
                    Mode C Off-Site Out:
                  </span>
                  <span className="font-bold text-tertiary">
                    {employee.allowOffsiteTimeout
                      ? "Authorized (Errand/Field)"
                      : "In-Store Only"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Mobile Navigation Dock */}
        <nav className="bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.05)] border-t border-slate-200/80">
          <div className="flex justify-around items-center h-20 px-margin-mobile">
            <button
              type="button"
              onClick={() => setMobileTab("station")}
              className={`flex flex-col items-center justify-center min-w-[72px] min-h-[48px] py-1 transition-all ${
                mobileTab === "station"
                  ? "text-primary-container font-headline-sm scale-105"
                  : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[28px]">
                fingerprint
              </span>
              <span className="font-label-md text-label-md mt-0.5">
                Punch Station
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("history")}
              className={`flex flex-col items-center justify-center min-w-[72px] min-h-[48px] py-1 transition-all ${
                mobileTab === "history"
                  ? "text-primary-container font-headline-sm scale-105"
                  : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[28px]">
                calendar_month
              </span>
              <span className="font-label-md text-label-md mt-0.5">
                My Attendance
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("shift")}
              className={`flex flex-col items-center justify-center min-w-[72px] min-h-[48px] py-1 transition-all ${
                mobileTab === "shift"
                  ? "text-primary-container font-headline-sm scale-105"
                  : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[28px]">
                schedule
              </span>
              <span className="font-label-md text-label-md mt-0.5">
                Shift Info
              </span>
            </button>
          </div>
        </nav>

        {/* 9. SUCCESS / CONFIRMATION MODAL */}
        {modalState?.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/60 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-md ${
                  modalState.isError
                    ? "bg-error-container text-on-error-container"
                    : "bg-tertiary-fixed text-tertiary"
                }`}
              >
                <span className="material-symbols-outlined text-[48px]">
                  {modalState.isError ? "gpp_bad" : "check_circle"}
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                  {modalState.title}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {modalState.details}
                </p>
              </div>
              <div className="w-full bg-surface-container-low rounded-lg p-3 text-left space-y-1.5 text-body-sm font-body-sm text-on-surface">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Method:</span>
                  <span className="font-bold">Biometric Selfie + Geofence</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Location:</span>
                  <span className="font-bold">{modalState.locationLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">JATS Hash:</span>
                  <span className="font-data-mono text-[11px] font-bold text-secondary">
                    {modalState.hash}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalState(null)}
                className="w-full h-12 rounded-xl bg-primary-container text-on-primary font-headline-sm text-headline-sm font-bold shadow-md active:scale-95 transition-transform"
              >
                Close &amp; Continue Shift
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
