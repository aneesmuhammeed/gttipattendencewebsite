-- Add date column to attendance_correction_requests and make session_id nullable
ALTER TABLE attendance_correction_requests ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE attendance_correction_requests ALTER COLUMN session_id DROP NOT NULL;

-- Update approve_correction_request to handle date-based corrections
CREATE OR REPLACE FUNCTION approve_correction_request(request_id UUID, reviewer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  req_student_id UUID;
  req_session_id UUID;
  req_date DATE;
  rec_id UUID;
BEGIN
  SELECT student_id, session_id, date INTO req_student_id, req_session_id, req_date
  FROM attendance_correction_requests WHERE id = request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Correction request not found';
  END IF;

  IF req_date IS NOT NULL THEN
    -- Date-based correction: upsert attendance record for that date
    -- Use first session of the day if available
    SELECT id INTO req_session_id
    FROM attendance_sessions
    WHERE attendance_date = req_date
    LIMIT 1;
  END IF;

  -- Upsert attendance record as present
  INSERT INTO attendance_records (student_id, session_id, attendance_date, status, latitude, longitude, marked_at)
  VALUES (req_student_id, req_session_id, COALESCE(req_date, CURRENT_DATE), 'present', 0, 0, NOW())
  ON CONFLICT (student_id, attendance_date) DO UPDATE SET status = 'present', updated_at = NOW()
  RETURNING id INTO rec_id;

  UPDATE attendance_correction_requests
  SET status = 'approved', reviewed_by = reviewer_id, reviewed_at = NOW()
  WHERE id = request_id;
END;
$$;

-- Update reject_correction_request
CREATE OR REPLACE FUNCTION reject_correction_request(request_id UUID, reviewer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE attendance_correction_requests
  SET status = 'rejected', reviewed_by = reviewer_id, reviewed_at = NOW()
  WHERE id = request_id;
END;
$$;
