-- Simplify attendance to one-per-day scheme
-- Replaces the Edge Function flow with a direct RPC

-- Make session_id nullable for one-day attendance (no session needed)
ALTER TABLE attendance_records ALTER COLUMN session_id DROP NOT NULL;
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS unique_student_per_session;
ALTER TABLE attendance_audit_logs ALTER COLUMN session_id DROP NOT NULL;

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
BEGIN
  -- Check if today is a holiday
  SELECT COUNT(*) INTO holiday_count FROM holidays WHERE date = today;
  IF holiday_count > 0 THEN
    RETURN 'HOLIDAY';
  END IF;

  -- Check if already marked
  IF EXISTS (SELECT 1 FROM attendance_records WHERE student_id = p_student_id AND attendance_date = today) THEN
    RETURN 'ALREADY_MARKED';
  END IF;

  -- Get college geofence settings
  SELECT latitude, longitude, geofence_radius_meters
  INTO college_lat, college_lng, radius_meters
  FROM college_settings LIMIT 1;

  -- Skip geofence check if no settings configured
  IF college_lat IS NOT NULL AND radius_meters IS NOT NULL THEN
    -- Haversine distance
    distance := 6371000 * 2 * ASIN(SQRT(
      POWER(SIN(RADIANS((p_latitude - college_lat) / 2)), 2) +
      COS(RADIANS(college_lat)) * COS(RADIANS(p_latitude)) *
      POWER(SIN(RADIANS((p_longitude - college_lng) / 2)), 2)
    ));

    IF distance > radius_meters THEN
      RETURN 'OUTSIDE_GEOFENCE';
    END IF;
  END IF;

  -- Mark attendance
  INSERT INTO attendance_records (student_id, attendance_date, status, latitude, longitude, marked_at, user_agent)
  VALUES (p_student_id, today, 'present', p_latitude, p_longitude, NOW(), 'one-day-attendance');

  RETURN 'SUCCESS';
END;
$$;
