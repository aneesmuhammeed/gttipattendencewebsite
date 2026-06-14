-- Remove department, semester, title from attendance_sessions
ALTER TABLE attendance_sessions DROP COLUMN IF EXISTS title;
ALTER TABLE attendance_sessions DROP COLUMN IF EXISTS department;
ALTER TABLE attendance_sessions DROP COLUMN IF EXISTS semester;

-- Remove department, semester from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS department;
ALTER TABLE profiles DROP COLUMN IF EXISTS semester;

-- Drop indexes referencing dropped columns
DROP INDEX IF EXISTS idx_sessions_department_semester;
