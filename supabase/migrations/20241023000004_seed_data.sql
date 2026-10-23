-- =============================================================================
-- JAYTEES ATTENDANCE & TIME-TRACKING SYSTEM (JATS v1.1)
-- Migration 04: Seed Data (3 Branches, Shift Templates, Sample Staff)
-- =============================================================================

-- 1. Insert 3 Branches
INSERT INTO public.branches (id, branch_code, name, short_name, address, ssid, lat, lng, radius_m, is_active)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'JTS-HQ-01',
    'Jaytees Flagship / Main Store',
    'Main Store',
    'Makati Flagship Hub, Metro Manila',
    'Jaytees_HQ_5G',
    14.5547,
    121.0244,
    150,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'JTS-DT-02',
    'Downtown Outlet',
    'Downtown',
    'Downtown Retail Strip, Manila',
    'Jaytees_DT_POS',
    14.5512,
    121.0289,
    120,
    true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'JTS-WM-03',
    'West Mall Kiosk / Store',
    'West Mall',
    'West Mall Ground Concourse, Mandaluyong',
    'WestMall_Guest_Secure',
    14.5610,
    121.0312,
    100,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  radius_m = EXCLUDED.radius_m,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng;

-- 2. Insert Standard Shift Templates for Flagship Main Store
INSERT INTO public.shift_templates (id, branch_id, name, badge_text, description, start_time, end_time, grace_minutes)
VALUES
  (
    'aaaa1111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Opening Shift',
    'Morning Front',
    'Store setup, cash-till vault reconciliation, breakfast prep.',
    '07:00:00',
    '16:00:00',
    15
  ),
  (
    'bbbb1111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Mid Shift',
    'Peak Volume',
    'Lunch rush reinforcement, inventory intake, dining floor relief.',
    '10:00:00',
    '19:00:00',
    15
  ),
  (
    'cccc1111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Closing Shift',
    'Night Lockup',
    'Dinner floor, kitchen deep sanitize, safe drop, register lockout.',
    '13:00:00',
    '22:00:00',
    10
  )
ON CONFLICT (id) DO NOTHING;
