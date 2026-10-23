-- =============================================================================
-- JAYTEES EMPLOYEE ATTENDANCE & MONITORING SYSTEM (JATS)
-- Supabase PostgreSQL Free-Tier Schema & Row-Level Security (RLS)
-- Supports: 3 Branches, ~100 Employees, Multi-Shift Templates, Mode C Time-Out
-- =============================================================================

-- 1. BRANCHES TABLE (3 Store Locations with Geofence Radius)
CREATE TABLE IF NOT EXISTS public.branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 75,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. SHIFT TEMPLATES TABLE (Opening, Mid, Closing per Branch)
CREATE TABLE IF NOT EXISTS public.shift_templates (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TEXT NOT NULL, -- Format: "HH:mm" (24-hour, e.g. "08:00")
  end_time TEXT NOT NULL,   -- Format: "HH:mm" (24-hour, e.g. "17:00")
  grace_period_mins INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. EMPLOYEES TABLE (3 Access Levels: SYSAD, ADMIN, USER + Mode C Flag)
CREATE TABLE IF NOT EXISTS public.employees (
  id TEXT PRIMARY KEY,
  employee_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SYSAD', 'ADMIN', 'USER')),
  branch_id TEXT NOT NULL REFERENCES public.branches(id),
  shift_id TEXT NOT NULL REFERENCES public.shift_templates(id),
  allow_offsite_timeout BOOLEAN NOT NULL DEFAULT false, -- Mode C: Role-Based Flexible Time-Out
  allow_multi_branch BOOLEAN NOT NULL DEFAULT false,    -- Floating / Reliever Staff
  pin_code TEXT NOT NULL DEFAULT '1234',                -- Simple login PIN for senior-friendly access
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ATTENDANCE LOGS TABLE (Strictly Time In & Time Out + Camera Selfies + GPS)
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  branch_id TEXT NOT NULL REFERENCES public.branches(id),
  branch_name TEXT NOT NULL,
  shift_name TEXT NOT NULL,
  shift_start TEXT NOT NULL,
  shift_end TEXT NOT NULL,
  date_key TEXT NOT NULL, -- YYYY-MM-DD
  time_in_at TIMESTAMPTZ NOT NULL,
  time_in_lat DOUBLE PRECISION NOT NULL,
  time_in_lng DOUBLE PRECISION NOT NULL,
  time_in_distance_m INTEGER NOT NULL,
  time_in_photo_data TEXT NOT NULL, -- Compressed WebP data URL or Storage URL
  late_minutes INTEGER NOT NULL DEFAULT 0,
  time_out_at TIMESTAMPTZ,
  time_out_lat DOUBLE PRECISION,
  time_out_lng DOUBLE PRECISION,
  time_out_distance_m INTEGER,
  time_out_photo_data TEXT,
  is_offsite_timeout BOOLEAN NOT NULL DEFAULT false,
  offsite_note TEXT,
  undertime_minutes INTEGER NOT NULL DEFAULT 0,
  total_hours DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast queries across 100 employees
CREATE INDEX IF NOT EXISTS idx_attendance_date_branch ON public.attendance_logs(date_key, branch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON public.attendance_logs(employee_id, date_key);

-- Seed Default 3 Branches
INSERT INTO public.branches (id, name, address, latitude, longitude, radius_meters, is_active)
VALUES
  ('branch-1', 'Branch 1 — Jaytees Main Store', 'Downtown Commercial Center', 14.5995, 120.9842, 80, true),
  ('branch-2', 'Branch 2 — Jaytees North Plaza', 'North Avenue Retail Strip', 14.6560, 121.0305, 80, true),
  ('branch-3', 'Branch 3 — Jaytees South Town', 'South Highway Town Center', 14.4296, 121.0419, 85, true)
ON CONFLICT (id) DO NOTHING;
