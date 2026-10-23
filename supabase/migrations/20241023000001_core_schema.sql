-- =============================================================================
-- JAYTEES ATTENDANCE & TIME-TRACKING SYSTEM (JATS v1.1)
-- Migration 01: Core Schema Tables
-- Tables: branches, profiles, shift_templates, punches, audit_log
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BRANCHES TABLE
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_code TEXT UNIQUE NOT NULL, -- e.g. 'JTS-HQ-01'
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,         -- e.g. 'Main'
  address TEXT NOT NULL,
  ssid TEXT NOT NULL,               -- e.g. 'Jaytees_HQ_5G'
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_m INTEGER NOT NULL DEFAULT 150,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. SHIFT TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.shift_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,               -- e.g. 'Opening Shift'
  badge_text TEXT NOT NULL DEFAULT 'Standard Slot',
  description TEXT,
  start_time TIME NOT NULL,          -- e.g. '07:00:00'
  end_time TIME NOT NULL,            -- e.g. '16:00:00'
  grace_minutes INTEGER NOT NULL DEFAULT 15,
  crosses_midnight BOOLEAN NOT NULL DEFAULT false,
  meal_deduct_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. PROFILES TABLE (App User Accounts & Staff Metadata)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,              -- Matches Supabase auth.users.id
  employee_code TEXT UNIQUE NOT NULL, -- e.g. 'EMP-6502'
  full_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('sysad', 'admin', 'user')),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  default_shift_id UUID REFERENCES public.shift_templates(id),
  allow_offsite_timeout BOOLEAN NOT NULL DEFAULT false, -- Mode C: Role-Based Flexible Time-Out
  allow_multi_branch BOOLEAN NOT NULL DEFAULT false,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. PUNCHES TABLE (Strict Append-Only Biometric & Geofence Ledger)
CREATE TABLE IF NOT EXISTS public.punches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  shift_template_id UUID REFERENCES public.shift_templates(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  punched_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- Server timestamp (zero client trust)
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy_m DOUBLE PRECISION NOT NULL,
  distance_m DOUBLE PRECISION NOT NULL,          -- Computed server-side (Haversine)
  inside_geofence BOOLEAN NOT NULL,
  is_mode_c BOOLEAN NOT NULL DEFAULT false,      -- Off-site Time Out approved via Mode C
  selfie_path TEXT NOT NULL,                     -- Path in Supabase storage bucket
  selfie_watermark TEXT,                         -- Metadata string burned into image
  note TEXT,                                     -- Errand or travel note for Mode C
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. AUDIT LOG TABLE (Compliance & Corrections Trail)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                          -- e.g. 'PUNCH_OVERRIDE', 'MODE_C_TOGGLE'
  target_table TEXT NOT NULL,
  target_id UUID,
  old_payload JSONB,
  new_payload JSONB,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_punches_profile_time ON public.punches(profile_id, punched_at DESC);
CREATE INDEX IF NOT EXISTS idx_punches_branch_time ON public.punches(branch_id, punched_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_branch ON public.profiles(branch_id);
