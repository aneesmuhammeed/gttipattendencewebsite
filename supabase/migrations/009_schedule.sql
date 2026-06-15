-- Replace attendance_sessions with a simple date-based schedule

CREATE TABLE IF NOT EXISTS attendance_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE attendance_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view schedule"
  ON attendance_schedule FOR SELECT USING (true);

CREATE POLICY "Admins and professors can manage schedule"
  ON attendance_schedule FOR INSERT
  WITH CHECK (is_admin() OR is_professor());

CREATE POLICY "Admins and professors can update schedule"
  ON attendance_schedule FOR UPDATE
  USING (is_admin() OR is_professor());

CREATE POLICY "Admins and professors can delete schedule"
  ON attendance_schedule FOR DELETE
  USING (is_admin() OR is_professor());

-- Expire past schedules: mark absent for unmarked students on passed dates
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

-- Update recalc_attendance_summary to use attendance_schedule
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

-- Update approve_correction_request to look up schedule by date
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

  -- Upsert attendance record as present
  INSERT INTO attendance_records (student_id, attendance_date, status, latitude, longitude, marked_at)
  VALUES (req_student_id, COALESCE(req_date, CURRENT_DATE), 'present', 0, 0, NOW())
  ON CONFLICT (student_id, attendance_date) DO UPDATE SET status = 'present', updated_at = NOW();

  UPDATE attendance_correction_requests
  SET status = 'approved', reviewed_by = reviewer_id, reviewed_at = NOW()
  WHERE id = request_id;
END;
$$;

-- Remove old session functions
DROP FUNCTION IF EXISTS expire_session_and_mark_absent(UUID);
DROP FUNCTION IF EXISTS expire_all_past_sessions();

-- Drop old table
DROP TABLE IF EXISTS attendance_sessions CASCADE;
