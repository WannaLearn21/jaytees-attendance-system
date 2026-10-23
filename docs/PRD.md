# Product Requirements Document (PRD): Jaytees Employee Attendance & Monitoring Web App

| Document Metadata | Details |
| :--- | :--- |
| **Product Name** | Jaytees Attendance & Time-Tracking System (JATS) |
| **Version** | **v1.1 (Locked-In MVP Specifications)** |
| **Target Scale** | 3 Branches, ~100 Employees |
| **Platform** | Mobile-First Progressive Web App (PWA) & Responsive Web Dashboard |
| **Target Budget (Phase 1)** | **$0 / month** (100% Free-Tier Cloud Infrastructure) |
| **Primary Goal** | Eliminate physical paper time cards, prevent time theft ("buddy punching"), and automate attendance tracking across all 3 branches. |

---

## 1. Executive Summary & Locked-In Operational Decisions

### 1.1 Problem Statement
Tracking attendance across **3 branches** for **~100 employees** using physical paper time cards creates recurring hardware/consumable expenses, risks "buddy punching" (employees punching cards for absent/late co-workers), and requires slow manual encoding every payroll cutoff.

### 1.2 Locked-In MVP Decisions (v1.1)
Based on stakeholder alignment, the Beta MVP is governed by these four core operational rules:
1. **Time-Out Policy — Mode C (Role-Based Flexible)**:
   * **Time In**: Strictly requires being **inside** the assigned branch's GPS geofence radius + a live camera selfie for **all** employees.
   * **Time Out**:
     * **Standard In-Store Staff**: Must be **inside** the branch vicinity to Time Out.
     * **Authorized Off-Site / Errand / Field Staff (`allow_offsite_timeout = true`)**: Can Time Out **outside** the store vicinity (captures exact remote GPS coordinates, distance from store, live watermarked selfie, and optional errand/location note). `SysAd` and Branch `Admin` can toggle this permission per employee.
2. **Device Strategy — Personal Smartphones First (Senior-Friendly UI) + Future Kiosk Option**:
   * **Beta Launch**: Employees use their own smartphones via mobile browser / installed PWA. Because the workforce includes older employees, the employee interface features **oversized, high-contrast buttons, large typography, and a simplified 1-screen punch flow**.
   * **Fallback Ready**: If Beta testing reveals specific employees without capable smartphones, a shared in-store Tablet Kiosk mode can be enabled without backend changes.
3. **Streamlined Punch Flow (Time In & Time Out Only)**:
   * No break-in/break-out punches are required. Employees only perform **Time In** at the start of their shift and **Time Out** at the end of their shift.
4. **Shift Scheduling — Multiple Shift Templates per Branch**:
   * Each branch supports multiple shift templates (e.g., **Opening Shift**, **Mid Shift**, **Closing Shift**) with configurable start time, end time, and grace period minutes so the system automatically calculates **Late (Minutes)**, **Undertime (Minutes)**, and **Total Worked Hours**.

---

## 2. User Roles & Access Levels (3-Tier RBAC)

| Feature / Capability | Level 1: `SysAd` (System Admin) | Level 2: `Admin` (Branch Admin) | Level 3: `User` (Employee) |
| :--- | :---: | :---: | :---: |
| **Time In (Inside Branch Geofence + Live Selfie)** | ✅ | ✅ | ✅ |
| **Time Out (Enforced by Mode C Role Policy)** | ✅ | ✅ | ✅ |
| **View Own Attendance History & Hours** | ✅ | ✅ | ✅ |
| **View Live Branch Attendance & Selfies** | All 3 Branches | Assigned Branch Only | ❌ |
| **Manage Shift Templates (Opening/Mid/Closing)** | All 3 Branches | Assigned Branch Only | ❌ |
| **Toggle Mode C (`Allow Off-Site Time Out`)** | All Employees | Assigned Branch Staff | ❌ |
| **Export Payroll Summary CSV / Excel** | All 3 Branches | Assigned Branch Only | ❌ |
| **Create / Edit Employee Accounts** | All Roles (`SysAd`, `Admin`, `User`) | `User` (In Assigned Branch) | ❌ |
| **Configure Branch GPS Coordinates & Radius** | ✅ | ❌ | ❌ |
| **Manage Free-Tier Photo Storage Cleanup** | ✅ | ❌ | ❌ |

---

## 3. Free-Tier Tech Stack ($0/Month Budget Architecture)

| Component | Technology | Free-Tier Allowance | Usage for 100 Employees (3 Branches) |
| :--- | :--- | :--- | :--- |
| **Frontend / PWA** | **Next.js (App Router, TypeScript) + Tailwind CSS** | 100% Free & Open Source | Senior-accessible mobile UI + Admin/SysAd dashboards. |
| **Hosting & HTTPS** | **Vercel (Hobby Tier)** | 100 GB bandwidth/mo + Free SSL | Automatic `HTTPS` required for mobile Camera & GPS APIs. |
| **Database & Auth** | **Supabase PostgreSQL + Auth** | 500 MB DB + 50,000 MAU | `~5,200` punches/month uses `< 20 MB/year` of database space. |
| **Selfie Storage** | **Supabase Storage (1 GB) / Cloudflare R2 (10 GB)** | 1 GB – 10 GB Free | At `~35 KB/photo`, `5,200` punches/mo = `~180 MB/mo`. Built-in 60-day photo purge keeps storage at `$0` indefinitely. |
