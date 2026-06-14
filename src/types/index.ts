export type UserRole = 'admin' | 'professor' | 'student';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  roll_number: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSession {
  id: string;
  session_code: string;
  attendance_date: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  marked_at: string;
  latitude: number;
  longitude: number;
  status: string;
  attendance_date: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface CollegeSettings {
  id: string;
  college_name: string;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  updated_at: string;
  updated_by: string | null;
}

export interface DashboardStats {
  total_students: number;
  present_today: number;
  absent_today: number;
  attendance_percentage: number;
  active_sessions: number;
  defaulters_count: number;
}

export interface AttendanceAuditLog {
  id: string;
  attendance_record_id: string | null;
  student_id: string;
  session_id: string;
  marked_at: string;
  ip_address: string | null;
  latitude: number | null;
  longitude: number | null;
  device_info: string | null;
  browser: string | null;
  user_agent: string | null;
  action_type: string;
  profiles?: { full_name: string; roll_number: string };
  attendance_sessions?: { session_code: string };
}

export interface AttendanceCorrectionRequest {
  id: string;
  student_id: string;
  session_id: string | null;
  date: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles?: { full_name: string; roll_number: string };
  attendance_sessions?: { session_code: string; attendance_date: string; start_time: string; end_time: string };
}

export interface MonthlyHeatmap {
  month: string;
  percentage: number;
  present: number;
  total: number;
}

export interface DailyTrend {
  date: string;
  percentage: number;
  present: number;
  total: number;
}

export interface ReportFilters {
  student_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface StudentAttendanceSummary {
  total_classes: number;
  present: number;
  absent: number;
  percentage: number;
}

export interface GeofenceResult {
  withinGeofence: boolean;
  distance: number;
  maxDistance: number;
  collegeLat: number;
  collegeLng: number;
}
