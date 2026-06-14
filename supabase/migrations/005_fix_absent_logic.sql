-- Fix recalc_attendance_summary to count sessions as total_classes
-- Previously it counted from attendance_records, which skipped missed days

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
  FROM attendance_sessions
  WHERE attendance_date <= CURRENT_DATE;

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
