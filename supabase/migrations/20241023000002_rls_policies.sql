-- =============================================================================
-- JAYTEES ATTENDANCE & TIME-TRACKING SYSTEM (JATS v1.1)
-- Migration 02: Row-Level Security (RLS) Policies
-- Security Boundaries:
--   - USER: Sees own punches and profile only.
--   - ADMIN: Sees own branch employees, shifts, and punches only.
--   - SYSAD: Sees all branches, employees, and punches globally.
-- =============================================================================

-- Helper function to fetch current authenticated user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper function to fetch current authenticated user's branch_id
CREATE OR REPLACE FUNCTION public.current_user_branch_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Enable RLS on all tables
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- BRANCHES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Branches viewable by authenticated users"
  ON public.branches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Branches modifiable by sysad only"
  ON public.branches FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'sysad');

-- -----------------------------------------------------------------------------
-- SHIFT TEMPLATES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Shift templates viewable by authenticated users"
  ON public.shift_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Shift templates modifiable by sysad or branch admin"
  ON public.shift_templates FOR ALL
  TO authenticated
  USING (
    public.current_user_role() = 'sysad'
    OR (public.current_user_role() = 'admin' AND branch_id = public.current_user_branch_id())
  );

-- -----------------------------------------------------------------------------
-- PROFILES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Profiles select policy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.current_user_role() = 'sysad'
    OR (public.current_user_role() = 'admin' AND branch_id = public.current_user_branch_id())
  );

CREATE POLICY "Profiles update policy"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'sysad'
    OR (public.current_user_role() = 'admin' AND branch_id = public.current_user_branch_id())
  );

-- -----------------------------------------------------------------------------
-- PUNCHES POLICIES (Append-Only)
-- -----------------------------------------------------------------------------
CREATE POLICY "Punches select policy"
  ON public.punches FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.current_user_role() = 'sysad'
    OR (public.current_user_role() = 'admin' AND branch_id = public.current_user_branch_id())
  );

CREATE POLICY "Punches insert policy (self only)"
  ON public.punches FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
  );

-- Reject updates & deletes directly from client (Append-Only enforcement)
CREATE POLICY "Punches no direct update"
  ON public.punches FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Punches no direct delete"
  ON public.punches FOR DELETE
  TO authenticated
  USING (false);

-- -----------------------------------------------------------------------------
-- AUDIT LOG POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Audit log viewable by sysad and admin"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('sysad', 'admin')
  );

CREATE POLICY "Audit log insert by sysad and admin"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('sysad', 'admin')
  );
