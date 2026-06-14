-- ============================================
-- Feature: Auto-mark absent when session expires
-- ============================================

-- Function: expire a session and mark absent for all students who didn't attend
CREATE OR REPLACE FUNCTION expire_session_and_mark_absent(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_session_date DATE;
  v_student RECORD;
  v_current_date DATE := CURRENT_DATE;
BEGIN
  -- Get the session's attendance date
  SELECT attendance_date INTO v_session_date
  FROM attendance_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Deactivate the session
  UPDATE attendance_sessions
  SET is_active = FALSE
  WHERE id = p_session_id AND is_active = TRUE;

  -- For each student who has NO record for this session's date, insert absent
  FOR v_student IN
    SELECT p.id AS student_id
    FROM profiles p
    WHERE p.role = 'student'
      AND NOT EXISTS (
        SELECT 1 FROM attendance_records ar
        WHERE ar.student_id = p.id
          AND ar.attendance_date = v_session_date
      )
  LOOP
    INSERT INTO attendance_records (
      student_id, session_id, attendance_date, status,
      latitude, longitude, marked_at, ip_address, user_agent
    ) VALUES (
      v_student.student_id, p_session_id, v_session_date, 'absent',
      0, 0, NOW(), '', 'system-auto-expire'
    )
    ON CONFLICT (student_id, attendance_date) DO NOTHING;
  END LOOP;
END;
$$;

-- Function: expire ALL sessions that have passed their end_time and are still active
CREATE OR REPLACE FUNCTION expire_all_past_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_session RECORD;
  v_count INTEGER := 0;
  v_now TIME := CURRENT_TIME;
BEGIN
  FOR v_session IN
    SELECT id FROM attendance_sessions
    WHERE is_active = TRUE
      AND (
        attendance_date < CURRENT_DATE
        OR (attendance_date = CURRENT_DATE AND end_time <= v_now)
      )
  LOOP
    PERFORM expire_session_and_mark_absent(v_session.id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION expire_session_and_mark_absent TO authenticated;
GRANT EXECUTE ON FUNCTION expire_all_past_sessions TO authenticated;
