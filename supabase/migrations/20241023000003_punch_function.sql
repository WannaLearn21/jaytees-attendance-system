-- =============================================================================
-- JAYTEES ATTENDANCE & TIME-TRACKING SYSTEM (JATS v1.1)
-- Migration 03: The Server-Side Punch Validation Function
-- Function: rpc_record_punch
-- Enforces:
--   1. Recomputes distance server-side using Haversine formula (meters).
--   2. Time In strictly inside branch geofence (distance <= radius_m).
--   3. Time Out inside geofence, OR outside if profile.allow_offsite_timeout = true (Mode C).
--   4. Max GPS accuracy threshold (50m default; rejects poor GPS fixes).
--   5. Double punch prevention (cannot Time In twice; cannot Time Out without prior Time In).
--   6. Always uses server-side NOW() timestamp (zero client trust).
--   7. Returns structured JSON with status, punch record, and senior-friendly error message.
-- =============================================================================

-- Server-side Haversine Distance Calculator (returns meters)
CREATE OR REPLACE FUNCTION public.calculate_haversine_meters(
  lat1 DOUBLE PRECISION,
  lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lng2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r CONSTANT DOUBLE PRECISION := 6371000; -- Earth's radius in meters
  dlat DOUBLE PRECISION;
  dlng DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat / 2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  RETURN r * c;
END;
$$;

-- Core Punch Recording Procedure
CREATE OR REPLACE FUNCTION public.rpc_record_punch(
  p_punch_type TEXT,            -- 'in' or 'out'
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_accuracy_m DOUBLE PRECISION,
  p_selfie_path TEXT,
  p_watermark TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_branch RECORD;
  v_last_punch RECORD;
  v_distance_m DOUBLE PRECISION;
  v_inside_geofence BOOLEAN;
  v_is_mode_c BOOLEAN := false;
  v_new_punch RECORD;
BEGIN
  -- 1. Identify authenticated caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'AUTH_REQUIRED',
      'message', 'Please sign in to record attendance.'
    );
  END IF;

  -- 2. Fetch employee profile
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF v_profile IS NULL OR v_profile.is_active = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PROFILE_INACTIVE',
      'message', 'Employee account is inactive or not found.'
    );
  END IF;

  -- 3. Fetch assigned branch
  SELECT * INTO v_branch FROM public.branches WHERE id = v_profile.branch_id;
  IF v_branch IS NULL OR v_branch.is_active = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'BRANCH_NOT_FOUND',
      'message', 'Assigned branch is currently inactive.'
    );
  END IF;

  -- 4. Check GPS accuracy threshold (reject spoofed / poor fixes > 50m)
  IF p_accuracy_m > 50.0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'GPS_ACCURACY_POOR',
      'message', 'GPS signal is weak (±' || round(p_accuracy_m::numeric, 1)::text || 'm). Please step outside or near a window and try again.'
    );
  END IF;

  -- 5. Calculate Haversine distance server-side
  v_distance_m := public.calculate_haversine_meters(p_lat, p_lng, v_branch.lat, v_branch.lng);
  v_inside_geofence := v_distance_m <= v_branch.radius_m;

  -- 6. Check state of last punch for double-punch prevention
  SELECT * INTO v_last_punch 
  FROM public.punches 
  WHERE profile_id = v_user_id 
  ORDER BY punched_at DESC 
  LIMIT 1;

  -- 7. Validate Time In vs. Time Out rules
  IF p_punch_type = 'in' THEN
    -- Check if already timed in
    IF v_last_punch IS NOT NULL AND v_last_punch.type = 'in' THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'ALREADY_TIMED_IN',
        'message', 'You are already Timed In. Please Time Out before clocking in again.'
      );
    END IF;

    -- Time In MUST be inside branch geofence
    IF NOT v_inside_geofence THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'OUTSIDE_GEOFENCE',
        'message', 'You are ' || round(v_distance_m::numeric)::text || 'm away from ' || v_branch.name || '. Time In is strictly allowed only within ' || v_branch.radius_m::text || 'm.'
      );
    END IF;

  ELSIF p_punch_type = 'out' THEN
    -- Check if employee is currently timed in
    IF v_last_punch IS NULL OR v_last_punch.type = 'out' THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'NO_TIME_IN_FOUND',
        'message', 'No active Time In found. You must Time In before clocking out.'
      );
    END IF;

    -- Mode C Rule for Time Out:
    IF NOT v_inside_geofence THEN
      IF v_profile.allow_offsite_timeout THEN
        v_is_mode_c := true;
      ELSE
        RETURN jsonb_build_object(
          'success', false,
          'code', 'MODE_C_NOT_PERMITTED',
          'message', 'You are outside the store (' || round(v_distance_m::numeric)::text || 'm). Off-site Time Out is not enabled for your role. Move closer to the store.'
        );
      END IF;
    END IF;

  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVALID_PUNCH_TYPE',
      'message', 'Invalid punch action.'
    );
  END IF;

  -- 8. Insert new punch (Append-Only)
  INSERT INTO public.punches (
    profile_id,
    branch_id,
    shift_template_id,
    type,
    punched_at,
    lat,
    lng,
    accuracy_m,
    distance_m,
    inside_geofence,
    is_mode_c,
    selfie_path,
    selfie_watermark,
    note
  ) VALUES (
    v_user_id,
    v_profile.branch_id,
    v_profile.default_shift_id,
    p_punch_type,
    now(),
    p_lat,
    p_lng,
    p_accuracy_m,
    round(v_distance_m::numeric, 1),
    v_inside_geofence,
    v_is_mode_c,
    p_selfie_path,
    p_watermark,
    p_note
  )
  RETURNING * INTO v_new_punch;

  RETURN jsonb_build_object(
    'success', true,
    'code', 'PUNCH_SUCCESS',
    'message', CASE 
      WHEN p_punch_type = 'in' THEN 'Time In recorded successfully at ' || to_char(v_new_punch.punched_at AT TIME ZONE 'Asia/Manila', 'HH12:MI AM')
      WHEN v_is_mode_c THEN 'Off-site Time Out (Mode C) approved & recorded at ' || to_char(v_new_punch.punched_at AT TIME ZONE 'Asia/Manila', 'HH12:MI AM')
      ELSE 'Time Out recorded successfully at ' || to_char(v_new_punch.punched_at AT TIME ZONE 'Asia/Manila', 'HH12:MI AM')
    END,
    'punch', row_to_json(v_new_punch)
  );
END;
$$;
