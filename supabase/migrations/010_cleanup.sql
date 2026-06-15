-- Drop stale session_id columns (session model is gone)
ALTER TABLE attendance_records DROP COLUMN IF EXISTS session_id;
ALTER TABLE attendance_correction_requests DROP COLUMN IF EXISTS session_id;
ALTER TABLE attendance_audit_logs DROP COLUMN IF EXISTS session_id;
