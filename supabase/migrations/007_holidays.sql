-- Holidays table for marking non-class days
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  reason TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view holidays"
  ON holidays FOR SELECT
  USING (true);

CREATE POLICY "Admins and professors can insert holidays"
  ON holidays FOR INSERT
  WITH CHECK (is_admin() OR is_professor());

CREATE POLICY "Admins and professors can delete holidays"
  ON holidays FOR DELETE
  USING (is_admin() OR is_professor());

-- Update recalc_attendance_summary to exclude holidays
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
  FROM attendance_sessions s
  WHERE s.attendance_date <= CURRENT_DATE
    AND NOT EXISTS (SELECT 1 FROM holidays h WHERE h.date = s.attendance_date);

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
