-- =============================================================================
-- JAYTEES ATTENDANCE & TIME-TRACKING SYSTEM (JATS v1.1)
-- Migration 04: Seed Data (3 Branches, Shift Templates, Sample Staff)
-- =============================================================================

-- 1. Insert 3 Branches
INSERT INTO public.branches (id, branch_code, name, short_name, address, ssid, lat, lng, radius_m, is_active)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'JTS-MHL-01',
    'Jaytees Tagaytay Maharlika (Main Branch)',
    'Maharlika Main',
    'Emilio Aguinaldo Hwy, Maharlika East, Tagaytay City, Cavite',
    'Jaytees_Maharlika_5G',
    14.1023,
    120.9522,
    150,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'JTS-RTD-02',
    'Jaytees Rotunda',
    'Rotunda',
    'Tagaytay Rotunda, Silang Crossing Junction, Tagaytay City, Cavite',
    'Jaytees_Rotunda_POS',
    14.1153,
    120.9621,
    120,
    true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'JTS-PV9-09',
    'Jaytees Perfect View (9th Branch)',
    'Perfect View (9th)',
    'Tagaytay-Nasugbu Hwy, Laurel Ridge (Overlooking Taal Lake), Batangas',
    'Jaytees_PerfectView_WiFi',
    14.0742,
    120.8525,
    180,
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
