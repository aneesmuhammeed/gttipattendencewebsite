-- ============================================================
-- Combined migration: One-day attendance scheme
-- Merges 008, 009, 010 into a single deployable script
-- ============================================================

-- 1. Make session_id nullable if column still exists (safe for clean/re-run)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'session_id') THEN
    ALTER TABLE attendance_records ALTER COLUMN session_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_audit_logs' AND column_name = 'session_id') THEN
    ALTER TABLE attendance_audit_logs ALTER COLUMN session_id DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS unique_student_per_session;

-- 2. Create attendance_schedule table (replaces attendance_sessions)
CREATE TABLE IF NOT EXISTS attendance_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- 3. mark_today_attendance RPC — single-click attendance marking
CREATE OR REPLACE FUNCTION mark_today_attendance(
  p_student_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION
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
  schedule_count INT;
BEGIN
  SELECT COUNT(*) INTO holiday_count FROM holidays WHERE date = today;
  IF holiday_count > 0 THEN
    RETURN 'HOLIDAY';
  END IF;

  SELECT COUNT(*) INTO schedule_count FROM attendance_schedule WHERE date = today;
  IF schedule_count = 0 THEN
    RETURN 'NO_SCHEDULE';
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
  VALUES (p_student_id, today, 'present', p_latitude, p_longitude, NOW(), 'one-day-attendance');

  RETURN 'SUCCESS';
END;
$$;

-- 4. expire_past_schedules RPC — marks absent on past schedule dates
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

GRANT EXECUTE ON FUNCTION expire_past_schedules TO authenticated;

-- 5. Recalculate summary using attendance_schedule + holidays
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

-- 6. RPC to delete a schedule date + all associated data (attendance + audit logs + recalc)
CREATE OR REPLACE FUNCTION delete_schedule_date(p_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_student_ids UUID[];
BEGIN
  -- Collect affected students before cleanup
  SELECT ARRAY_AGG(DISTINCT student_id) INTO v_student_ids
  FROM attendance_records WHERE attendance_date = p_date;

  -- Delete audit logs referencing attendance records for this date
  DELETE FROM attendance_audit_logs
  WHERE attendance_record_id IN (SELECT id FROM attendance_records WHERE attendance_date = p_date);

  -- Delete attendance records for this date
  DELETE FROM attendance_records WHERE attendance_date = p_date;

  -- Delete schedule entry (if any)
  DELETE FROM attendance_schedule WHERE date = p_date;

  -- Recalculate summaries for affected students
  IF v_student_ids IS NOT NULL THEN
    FOR i IN 1 .. array_length(v_student_ids, 1) LOOP
      PERFORM recalc_attendance_summary(v_student_ids[i]);
    END LOOP;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_schedule_date TO authenticated;

-- RPC to recalculate attendance summaries for all students (one-time fix for corrupted data)
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

GRANT EXECUTE ON FUNCTION recalculate_all_summaries TO authenticated;

-- 7. Update approve_correction_request to use date (no session_id)
CREATE OR REPLACE FUNCTION approve_correction_request(request_id UUID, reviewer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- 7. Drop old session functions and table
DROP FUNCTION IF EXISTS expire_session_and_mark_absent(UUID);
DROP FUNCTION IF EXISTS expire_all_past_sessions();
DROP TABLE IF EXISTS attendance_sessions CASCADE;

-- 8. Drop stale session_id columns (final cleanup)
ALTER TABLE attendance_records DROP COLUMN IF EXISTS session_id;
ALTER TABLE attendance_correction_requests DROP COLUMN IF EXISTS session_id;
ALTER TABLE attendance_audit_logs DROP COLUMN IF EXISTS session_id;

-- 9. Drop old session-code indexes
DROP INDEX IF EXISTS idx_sessions_code;
DROP INDEX IF EXISTS idx_sessions_date;
DROP INDEX IF EXISTS idx_attendance_session;
DROP INDEX IF EXISTS idx_audit_session;
DROP INDEX IF EXISTS idx_correction_session;
