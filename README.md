# Jaytees Employee Attendance & Monitoring Web App (JATS)

A mobile-first, paperless attendance tracking Progressive Web App (PWA) built for **Jaytees (3 Branches, ~100 Employees)** on a **$0/month Free-Tier Cloud Stack**.

## Key Features (Locked-In v1.1 PRD)

1. **Camera Selfie Verification (Anti-Buddy Punching)**
   - Streams directly from the employee's front-facing camera (`navigator.mediaDevices.getUserMedia`). Gallery uploads are disabled.
   - Automatically burns a tamper-evident metadata watermark (`TIME IN / TIME OUT`, Employee Code & Name, Branch Name, Server Timestamp, and GPS Distance) onto an HTML5 `<canvas>` and compresses to lightweight `WebP` (`~35 KB`).
2. **Branch Vicinity Geofencing & Mode C Role-Based Flexible Time-Out**
   - **Time In**: Strictly requires being within the allowed meter radius of the assigned branch for **all** employees.
   - **Time Out (Mode C)**:
     - **Standard Store Staff (`allowOffsiteTimeout = false`)**: Must be inside the branch geofence radius to Time Out.
     - **Authorized Off-Site / Errand / Delivery Staff (`allowOffsiteTimeout = true`)**: Can Time Out outside the store vicinity with live selfie, remote GPS coordinates, and an optional errand/delivery note.
3. **Senior-Friendly Mobile Interface (Strictly Time In & Time Out)**
   - High-contrast status banners and oversized touch buttons tailored for older employees using personal smartphones, with zero break-punch clutter.
4. **3-Tier Role-Based Access Control (`SYSAD`, `ADMIN`, `USER`)**
   - **Level 1 (`SYSAD`)**: Full access across all 3 branches, interactive branch GPS coordinate & radius configurator, 100-employee bulk simulator, and free-tier storage monitor.
   - **Level 2 (`ADMIN`)**: Scoped to their assigned branch; views live digital time cards & selfies, manages shift templates (`Opening`, `Mid`, `Closing`), toggles **Mode C Off-Site Time Out** per employee, and exports payroll CSV spreadsheets.
   - **Level 3 (`USER`)**: Senior-friendly Time In / Time Out terminal and personal digital time card history.

---

## Quick Start (Local Development)

```bash
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000` in your browser.

---

## Deploying for $0/Month (Free Tier)

1. **Database**: Create a free project on [Supabase](https://supabase.com) and run [`supabase/schema.sql`](./supabase/schema.sql) in the SQL Editor.
2. **Hosting & Automatic HTTPS**: Push this folder to GitHub and import into [Vercel (Hobby Free Tier)](https://vercel.com) with `.env.local` variables from [`.env.example`](./.env.example).
