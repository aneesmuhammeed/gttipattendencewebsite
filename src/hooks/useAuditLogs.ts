import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AttendanceAuditLog } from '@/types';
import type { ReportFilters } from '@/types';

export function useAuditLogs(filters?: ReportFilters) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('attendance_audit_logs')
        .select('*, profiles!attendance_audit_logs_student_id_fkey(full_name, roll_number), attendance_sessions!attendance_audit_logs_session_id_fkey(session_code)')
        .order('marked_at', { ascending: false })
        .limit(500);

      if (filters?.student_id) query = query.eq('student_id', filters.student_id);
      if (filters?.start_date) query = query.gte('marked_at', filters.start_date);
      if (filters?.end_date) query = query.lte('marked_at', filters.end_date + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;
      return data as AttendanceAuditLog[];
    },
  });
}
