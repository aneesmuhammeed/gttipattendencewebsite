-- ============================================================
-- Complete schema: College Attendance Management System
-- Self-contained — runs on a fresh database or re-runs safely
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'professor', 'student');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Helper functions used by RLS policies
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION is_professor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'professor');
$$;

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  roll_number TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- College settings (geofence config)
CREATE TABLE IF NOT EXISTS college_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_name TEXT NOT NULL DEFAULT 'My College',
  latitude DOUBLE PRECISION NOT NULL DEFAULT 11.0168,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 76.9558,
  geofence_radius_meters INTEGER NOT NULL DEFAULT 200,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Attendance schedule (replaces old attendance_sessions)
CREATE TABLE IF NOT EXISTS attendance_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Holidays
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  reason TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attendance records
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ip_address TEXT,
  user_agent TEXT
);

-- Attendance audit logs
CREATE TABLE IF NOT EXISTS attendance_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_record_id UUID REFERENCES attendance_records(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES profiles(id),
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  device_info TEXT,
  browser TEXT,
  user_agent TEXT,
  action_type TEXT NOT NULL DEFAULT 'mark'
);

-- Attendance summary
CREATE TABLE IF NOT EXISTS attendance_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_classes INTEGER NOT NULL DEFAULT 0,
  present INTEGER NOT NULL DEFAULT 0,
  absent INTEGER NOT NULL DEFAULT 0,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Correction requests
CREATE TABLE IF NOT EXISTS attendance_correction_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  date DATE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS unique_student_per_day ON attendance_records(student_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance_records(student_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_audit_student ON attendance_audit_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON attendance_audit_logs(marked_at);
CREATE INDEX IF NOT EXISTS idx_summary_percentage ON attendance_summary(percentage);
CREATE INDEX IF NOT EXISTS idx_correction_student ON attendance_correction_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_correction_status ON attendance_correction_requests(status);

-- ============================================================
-- TRIGGER: auto-create profile on user signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, roll_number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'student'::public.user_role
    ),
    NULLIF(NEW.raw_user_meta_data->>'roll_number', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_college_settings_updated_at ON college_settings;
CREATE TRIGGER set_college_settings_updated_at
  BEFORE UPDATE ON college_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGER: audit log on attendance insert
-- ============================================================
CREATE OR REPLACE FUNCTION log_attendance_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  ua TEXT;
  browser TEXT;
  device TEXT;
BEGIN
  ua := NEW.user_agent;
  browser := CASE
    WHEN ua ILIKE '%chrome%' AND ua NOT ILIKE '%edg%' THEN 'Chrome'
    WHEN ua ILIKE '%firefox%' THEN 'Firefox'
    WHEN ua ILIKE '%safari%' AND ua NOT ILIKE '%chrome%' THEN 'Safari'
    WHEN ua ILIKE '%edg%' THEN 'Edge'
    ELSE 'Unknown'
  END;
  device := CASE
    WHEN ua ILIKE '%mobile%' OR ua ILIKE '%android%' OR ua ILIKE '%iphone%' THEN 'Mobile'
    WHEN ua ILIKE '%tablet%' OR ua ILIKE '%ipad%' THEN 'Tablet'
    ELSE 'Desktop'
  END;

  INSERT INTO attendance_audit_logs (
    attendance_record_id, student_id, marked_at,
    ip_address, latitude, longitude, device_info, browser, user_agent, action_type
  ) VALUES (
    NEW.id, NEW.student_id, NEW.marked_at,
    NEW.ip_address, NEW.latitude, NEW.longitude,
    device, browser, NEW.user_agent, 'mark'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_attendance_inserted ON attendance_records;
CREATE TRIGGER on_attendance_inserted
  AFTER INSERT ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION log_attendance_audit();

-- ============================================================
-- TRIGGER: auto-update attendance_summary
-- ============================================================
CREATE OR REPLACE FUNCTION update_attendance_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  PERFORM recalc_attendance_summary(NEW.student_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_attendance_summary_update ON attendance_records;
CREATE TRIGGER on_attendance_summary_update
  AFTER INSERT OR UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_summary();

-- ============================================================
-- RPC: mark_today_attendance
-- ============================================================
CREATE OR REPLACE FUNCTION mark_today_attendance(
  p_student_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  college_lat DOUBLE PRECISION;
  college_lng DOUBLE PRECISION;
  radius_meters DOUBLE PRECISION;
  distance DOUBLE PRECISION;
  holiday_count INT;
  schedule_start TIME;
  schedule_end TIME;
  now_time TIME;
BEGIN
  SELECT COUNT(*) INTO holiday_count FROM holidays WHERE date = today;
  IF holiday_count > 0 THEN
    RETURN 'HOLIDAY';
  END IF;

  SELECT start_time, end_time INTO schedule_start, schedule_end
  FROM attendance_schedule WHERE date = today;
  IF schedule_start IS NULL THEN
    RETURN 'NO_SCHEDULE';
  END IF;

  now_time := CURRENT_TIME;
  IF now_time < schedule_start THEN
    RETURN 'CLASS_NOT_STARTED';
  END IF;
  IF now_time > schedule_end THEN
    RETURN 'CLASS_EXPIRED';
  END IF;

  IF EXISTS (SELECT 1 FROM attendance_records WHERE student_id = p_student_id AND attendance_date = today) THEN
    RETURN 'ALREADY_MARKED';
  END IF;

  SELECT latitude, longitude, geofence_radius_meters
  INTO college_lat, college_lng, radius_meters
  FROM college_settings LIMIT 1;

  IF college_lat IS NOT NULL AND radius_meters IS NOT NULL THEN
    distance := 6371000 * 2 * ASIN(SQRT(
      POWER(SIN(RADIANS((p_latitude - college_lat) / 2)), 2) +
      COS(RADIANS(college_lat)) * COS(RADIANS(p_latitude)) *
      POWER(SIN(RADIANS((p_longitude - college_lng) / 2)), 2)
    ));

    IF distance > radius_meters THEN
      RETURN 'OUTSIDE_GEOFENCE';
    END IF;
  END IF;

  INSERT INTO attendance_records (student_id, attendance_date, status, latitude, longitude, marked_at, user_agent)
  VALUES (p_student_id, today, 'present', p_latitude, p_longitude, NOW(), COALESCE(p_user_agent, 'unknown'));

  RETURN 'SUCCESS';
END;
$$;

GRANT EXECUTE ON FUNCTION mark_today_attendance(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) TO authenticated;

-- ============================================================
-- RPC: expire_past_schedules
-- ============================================================
CREATE OR REPLACE FUNCTION expire_past_schedules()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_count INTEGER := 0;
  v_now TIME := CURRENT_TIME;
BEGIN
  INSERT INTO attendance_records (student_id, attendance_date, status, latitude, longitude, marked_at, user_agent)
  SELECT p.id AS student_id, s.date, 'absent', 0, 0, NOW(), 'system-auto-expire'
  FROM attendance_schedule s
  CROSS JOIN profiles p
  WHERE p.role = 'student'
    AND (s.date < CURRENT_DATE OR (s.date = CURRENT_DATE AND s.end_time <= v_now))
    AND NOT EXISTS (
      SELECT 1 FROM attendance_records ar
      WHERE ar.student_id = p.id AND ar.attendance_date = s.date
    )
  ON CONFLICT (student_id, attendance_date) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION expire_past_schedules() TO authenticated;

-- ============================================================
-- RPC: recalc_attendance_summary
-- ============================================================
CREATE OR REPLACE FUNCTION recalc_attendance_summary(p_student_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  total INT;
  present_count INT;
  pct DECIMAL(5,2);
BEGIN
  SELECT COUNT(*) INTO total
  FROM attendance_schedule s
  WHERE s.date <= CURRENT_DATE
    AND NOT EXISTS (SELECT 1 FROM holidays h WHERE h.date = s.date);

  SELECT COUNT(*) INTO present_count
  FROM attendance_records
  WHERE student_id = p_student_id AND status = 'present';

  pct := CASE WHEN total > 0 THEN ROUND((present_count::DECIMAL / total) * 100, 2) ELSE 0 END;

  INSERT INTO attendance_summary (student_id, total_classes, present, absent, percentage, updated_at)
  VALUES (p_student_id, total, present_count, GREATEST(total - present_count, 0), pct, NOW())
  ON CONFLICT (student_id)
  DO UPDATE SET
    total_classes = EXCLUDED.total_classes,
    present = EXCLUDED.present,
    absent = EXCLUDED.absent,
    percentage = EXCLUDED.percentage,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- ============================================================
-- RPC: delete_schedule_date
-- ============================================================
CREATE OR REPLACE FUNCTION delete_schedule_date(p_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_student_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT student_id) INTO v_student_ids
  FROM attendance_records WHERE attendance_date = p_date;

  DELETE FROM attendance_audit_logs
  WHERE attendance_record_id IN (SELECT id FROM attendance_records WHERE attendance_date = p_date);

  DELETE FROM attendance_records WHERE attendance_date = p_date;

  DELETE FROM attendance_schedule WHERE date = p_date;

  IF v_student_ids IS NOT NULL THEN
    FOR i IN 1 .. array_length(v_student_ids, 1) LOOP
      PERFORM recalc_attendance_summary(v_student_ids[i]);
    END LOOP;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_schedule_date(p_date DATE) TO authenticated;

-- ============================================================
-- RPC: recalculate_all_summaries
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_all_summaries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  stu RECORD;
BEGIN
  FOR stu IN SELECT id FROM profiles WHERE role = 'student' LOOP
    PERFORM recalc_attendance_summary(stu.id);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION recalculate_all_summaries() TO authenticated;

-- ============================================================
-- RPC: approve_correction_request
-- ============================================================
CREATE OR REPLACE FUNCTION approve_correction_request(request_id UUID, reviewer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  req_student_id UUID;
  req_date DATE;
BEGIN
  SELECT student_id, date INTO req_student_id, req_date
  FROM attendance_correction_requests WHERE id = request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Correction request not found';
  END IF;

  INSERT INTO attendance_records (student_id, attendance_date, status, latitude, longitude, marked_at)
  VALUES (req_student_id, COALESCE(req_date, CURRENT_DATE), 'present', 0, 0, NOW())
  ON CONFLICT (student_id, attendance_date) DO UPDATE SET status = 'present';

  UPDATE attendance_correction_requests
  SET status = 'approved', reviewed_by = reviewer_id, reviewed_at = NOW()
  WHERE id = request_id;
END;
$$;

-- ============================================================
-- RPC: reject_correction_request
-- ============================================================
CREATE OR REPLACE FUNCTION reject_correction_request(request_id UUID, reviewer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE attendance_correction_requests
  SET status = 'rejected', reviewed_by = reviewer_id, reviewed_at = NOW()
  WHERE id = request_id AND status = 'pending';
END;
$$;

-- ============================================================
-- SEED: college_settings
-- ============================================================
INSERT INTO college_settings (college_name, latitude, longitude, geofence_radius_meters)
VALUES ('My College', 11.0168, 76.9558, 200)
ON CONFLICT DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- ============================
-- Profiles
-- ============================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Professors can view all profiles" ON profiles;
CREATE POLICY "Professors can view all profiles"
  ON profiles FOR SELECT
  USING (is_professor());

-- ============================
-- College settings
-- ============================
ALTER TABLE college_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read college settings" ON college_settings;
CREATE POLICY "Anyone can read college settings"
  ON college_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can update college settings" ON college_settings;
CREATE POLICY "Only admins can update college settings"
  ON college_settings FOR UPDATE
  USING (is_admin());

-- ============================
-- Attendance schedule
-- ============================
ALTER TABLE attendance_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view schedule" ON attendance_schedule;
CREATE POLICY "Anyone can view schedule"
  ON attendance_schedule FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and professors can manage schedule" ON attendance_schedule;
CREATE POLICY "Admins and professors can manage schedule"
  ON attendance_schedule FOR INSERT
  WITH CHECK (is_admin() OR is_professor());

DROP POLICY IF EXISTS "Admins and professors can update schedule" ON attendance_schedule;
CREATE POLICY "Admins and professors can update schedule"
  ON attendance_schedule FOR UPDATE
  USING (is_admin() OR is_professor());

DROP POLICY IF EXISTS "Admins and professors can delete schedule" ON attendance_schedule;
CREATE POLICY "Admins and professors can delete schedule"
  ON attendance_schedule FOR DELETE
  USING (is_admin() OR is_professor());

-- ============================
-- Holidays
-- ============================
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view holidays" ON holidays;
CREATE POLICY "Anyone can view holidays"
  ON holidays FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins and professors can insert holidays" ON holidays;
CREATE POLICY "Admins and professors can insert holidays"
  ON holidays FOR INSERT
  WITH CHECK (is_admin() OR is_professor());

DROP POLICY IF EXISTS "Admins and professors can delete holidays" ON holidays;
CREATE POLICY "Admins and professors can delete holidays"
  ON holidays FOR DELETE
  USING (is_admin() OR is_professor());

-- ============================
-- Attendance records
-- ============================
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own attendance" ON attendance_records;
CREATE POLICY "Students can view own attendance"
  ON attendance_records FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own attendance" ON attendance_records;
CREATE POLICY "Students can insert own attendance"
  ON attendance_records FOR INSERT
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Professors can view all attendance" ON attendance_records;
CREATE POLICY "Professors can view all attendance"
  ON attendance_records FOR SELECT
  USING (is_professor());

DROP POLICY IF EXISTS "Professors can update attendance" ON attendance_records;
CREATE POLICY "Professors can update attendance"
  ON attendance_records FOR UPDATE
  USING (is_professor() OR is_admin());

DROP POLICY IF EXISTS "Admins can view all attendance" ON attendance_records;
CREATE POLICY "Admins can view all attendance"
  ON attendance_records FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can update any attendance" ON attendance_records;
CREATE POLICY "Admins can update any attendance"
  ON attendance_records FOR UPDATE
  USING (is_admin());

-- ============================
-- Attendance audit logs
-- ============================
ALTER TABLE attendance_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own audit logs" ON attendance_audit_logs;
CREATE POLICY "Students can view own audit logs"
  ON attendance_audit_logs FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Professors can view all audit logs" ON attendance_audit_logs;
CREATE POLICY "Professors can view all audit logs"
  ON attendance_audit_logs FOR SELECT
  USING (is_professor());

DROP POLICY IF EXISTS "Admins can view all audit logs" ON attendance_audit_logs;
CREATE POLICY "Admins can view all audit logs"
  ON attendance_audit_logs FOR SELECT
  USING (is_admin());

-- ============================
-- Attendance summary
-- ============================
ALTER TABLE attendance_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own summary" ON attendance_summary;
CREATE POLICY "Students can view own summary"
  ON attendance_summary FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Professors can view all summaries" ON attendance_summary;
CREATE POLICY "Professors can view all summaries"
  ON attendance_summary FOR SELECT
  USING (is_professor());

DROP POLICY IF EXISTS "Admins can view all summaries" ON attendance_summary;
CREATE POLICY "Admins can view all summaries"
  ON attendance_summary FOR SELECT
  USING (is_admin());

-- ============================
-- Correction requests
-- ============================
ALTER TABLE attendance_correction_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own correction requests" ON attendance_correction_requests;
CREATE POLICY "Students can view own correction requests"
  ON attendance_correction_requests FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can create correction requests" ON attendance_correction_requests;
CREATE POLICY "Students can create correction requests"
  ON attendance_correction_requests FOR INSERT
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Professors can view all correction requests" ON attendance_correction_requests;
CREATE POLICY "Professors can view all correction requests"
  ON attendance_correction_requests FOR SELECT
  USING (is_professor());

DROP POLICY IF EXISTS "Professors can update all correction requests" ON attendance_correction_requests;
CREATE POLICY "Professors can update all correction requests"
  ON attendance_correction_requests FOR UPDATE
  USING (is_professor() OR is_admin());

DROP POLICY IF EXISTS "Admins can view all correction requests" ON attendance_correction_requests;
CREATE POLICY "Admins can view all correction requests"
  ON attendance_correction_requests FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can update all correction requests" ON attendance_correction_requests;
CREATE POLICY "Admins can update all correction requests"
  ON attendance_correction_requests FOR UPDATE
  USING (is_admin());
