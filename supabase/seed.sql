-- ============================================
-- Seed Data
-- ============================================

-- Ensure college settings exist
INSERT INTO college_settings (college_name, latitude, longitude, geofence_radius_meters)
VALUES ('My College', 11.0168, 76.9558, 200)
ON CONFLICT DO NOTHING;

-- Create demo accounts (passwords will be set via Supabase dashboard)
-- These are placeholder auth user inserts
-- Use Supabase dashboard or API to create actual users with passwords

-- Example: Create a test admin profile
-- (auth.users insert is handled by Supabase Auth)
-- Then profile is auto-created via trigger

-- Sample attendance sessions for testing
INSERT INTO attendance_sessions (title, session_code, department, semester, attendance_date, start_time, end_time, created_by)
SELECT
  'Data Structures Lecture',
  'cse-s3-20260614-0900',
  'Computer Science',
  3,
  '2026-06-14',
  '09:00',
  '10:00',
  id
FROM profiles
WHERE role = 'professor'
LIMIT 1;

INSERT INTO attendance_sessions (title, session_code, department, semester, attendance_date, start_time, end_time, created_by)
SELECT
  'Database Systems Lecture',
  'cse-s4-20260614-1100',
  'Computer Science',
  4,
  '2026-06-14',
  '11:00',
  '12:30',
  id
FROM profiles
WHERE role = 'professor'
LIMIT 1;
