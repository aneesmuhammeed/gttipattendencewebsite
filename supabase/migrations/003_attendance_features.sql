-- ============================================
-- Feature: Audit Trail, Summary, Corrections
-- ============================================

-- 1. ATTENDANCE AUDIT LOGS
CREATE TABLE attendance_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_record_id UUID REFERENCES attendance_records(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES profiles(id),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id),
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  device_info TEXT,
  browser TEXT,
  user_agent TEXT,
  action_type TEXT NOT NULL DEFAULT 'mark'
);

CREATE INDEX idx_audit_student ON attendance_audit_logs(student_id);
CREATE INDEX idx_audit_session ON attendance_audit_logs(session_id);
CREATE INDEX idx_audit_date ON attendance_audit_logs(marked_at);

-- Auto-populate audit log when attendance is marked
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
    attendance_record_id, student_id, session_id, marked_at,
    ip_address, latitude, longitude, device_info, browser, user_agent, action_type
  ) VALUES (
    NEW.id, NEW.student_id, NEW.session_id, NEW.marked_at,
    NEW.ip_address, NEW.latitude, NEW.longitude,
    device, browser, NEW.user_agent, 'mark'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_attendance_inserted
  AFTER INSERT ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION log_attendance_audit();

-- 2. ATTENDANCE SUMMARY (pre-calculated percentages)
CREATE TABLE attendance_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_classes INTEGER NOT NULL DEFAULT 0,
  present INTEGER NOT NULL DEFAULT 0,
  absent INTEGER NOT NULL DEFAULT 0,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_summary_percentage ON attendance_summary(percentage);

-- Recalculate summary for a student
CREATE OR REPLACE FUNCTION recalc_attendance_summary(p_student_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  total INT;
  present INT;
  absent INT;
  pct DECIMAL(5,2);
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'present'), COUNT(*) FILTER (WHERE status != 'present')
  INTO total, present, absent
  FROM attendance_records
  WHERE student_id = p_student_id;

  pct := CASE WHEN total > 0 THEN ROUND((present::DECIMAL / total) * 100, 2) ELSE 0 END;

  INSERT INTO attendance_summary (student_id, total_classes, present, absent, percentage, updated_at)
  VALUES (p_student_id, total, present, absent, pct, NOW())
  ON CONFLICT (student_id)
  DO UPDATE SET
    total_classes = EXCLUDED.total_classes,
    present = EXCLUDED.present,
    absent = EXCLUDED.absent,
    percentage = EXCLUDED.percentage,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- Auto-update summary when attendance is inserted
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

CREATE TRIGGER on_attendance_summary_update
  AFTER INSERT OR UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_summary();

-- 3. ATTENDANCE CORRECTION REQUESTS
CREATE TABLE attendance_correction_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_correction_student ON attendance_correction_requests(student_id);
CREATE INDEX idx_correction_status ON attendance_correction_requests(status);
CREATE INDEX idx_correction_session ON attendance_correction_requests(session_id);

-- RLS for correction requests
ALTER TABLE attendance_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_correction_requests ENABLE ROW LEVEL SECURITY;

-- Audit logs RLS
CREATE POLICY "Students can view own audit logs"
  ON attendance_audit_logs FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Professors can view audit logs for their sessions"
  ON attendance_audit_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM attendance_sessions WHERE id = session_id AND created_by = auth.uid())
  );

CREATE POLICY "Admins can view all audit logs"
  ON attendance_audit_logs FOR SELECT
  USING (is_admin());

-- Summary RLS
CREATE POLICY "Students can view own summary"
  ON attendance_summary FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Professors can view all summaries"
  ON attendance_summary FOR SELECT
  USING (is_professor());

CREATE POLICY "Admins can view all summaries"
  ON attendance_summary FOR SELECT
  USING (is_admin());

-- Correction requests RLS
CREATE POLICY "Students can view own correction requests"
  ON attendance_correction_requests FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can create correction requests"
  ON attendance_correction_requests FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Professors can view requests for their sessions"
  ON attendance_correction_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM attendance_sessions WHERE id = session_id AND created_by = auth.uid())
  );

CREATE POLICY "Professors can update requests for their sessions"
  ON attendance_correction_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM attendance_sessions WHERE id = session_id AND created_by = auth.uid())
  );

CREATE POLICY "Admins can view all correction requests"
  ON attendance_correction_requests FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update all correction requests"
  ON attendance_correction_requests FOR UPDATE
  USING (is_admin());

-- Function to approve correction request (creates attendance record)
CREATE OR REPLACE FUNCTION approve_correction_request(request_id UUID, reviewer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  req RECORD;
BEGIN
  SELECT * INTO req FROM attendance_correction_requests WHERE id = request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF req.status != 'pending' THEN
    RAISE EXCEPTION 'Request already processed';
  END IF;

  -- Insert attendance record if not exists
  INSERT INTO attendance_records (session_id, student_id, status, attendance_date, latitude, longitude)
  SELECT req.session_id, req.student_id, 'present', s.attendance_date, 0, 0
  FROM attendance_sessions s WHERE s.id = req.session_id
  ON CONFLICT (session_id, student_id) DO NOTHING;

  -- Update request
  UPDATE attendance_correction_requests
  SET status = 'approved', reviewed_by = reviewer_id, reviewed_at = NOW()
  WHERE id = request_id;
END;
$$;

-- Function to reject correction request
CREATE OR REPLACE FUNCTION reject_correction_request(request_id UUID, reviewer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  UPDATE attendance_correction_requests
  SET status = 'rejected', reviewed_by = reviewer_id, reviewed_at = NOW()
  WHERE id = request_id AND status = 'pending';
END;
$$;
