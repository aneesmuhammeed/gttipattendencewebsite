import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ReportFilters, DashboardStats, StudentAttendanceSummary } from '@/types';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const [{ count: totalStudents }, { count: presentToday }, { count: activeSessions }, { count: defaulters }] =
        await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
          supabase
            .from('attendance_records')
            .select('*', { count: 'exact', head: true })
            .eq('attendance_date', today),
          supabase
            .from('attendance_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('attendance_date', today),
          supabase
            .from('attendance_summary')
            .select('*', { count: 'exact', head: true })
            .lt('percentage', 75),
        ]);

      const absentToday = (totalStudents ?? 0) - (presentToday ?? 0);
      const attendancePercentage =
        totalStudents && totalStudents > 0
          ? Math.round(((presentToday ?? 0) / totalStudents) * 100)
          : 0;

      return {
        total_students: totalStudents ?? 0,
        present_today: presentToday ?? 0,
        absent_today: absentToday,
        attendance_percentage: attendancePercentage,
        active_sessions: activeSessions ?? 0,
        defaulters_count: defaulters ?? 0,
      } as DashboardStats;
    },
    refetchInterval: 30000,
  });
}

export function useReportData(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-data', filters],
    queryFn: async () => {
      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          profiles!attendance_records_student_id_fkey(full_name, roll_number),
          attendance_sessions!inner(session_code)
        `);

      if (filters.start_date) {
        query = query.gte('attendance_date', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('attendance_date', filters.end_date);
      }
      if (filters.student_id) {
        query = query.eq('student_id', filters.student_id);
      }

      query = query.order('attendance_date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, roll_number')
        .eq('role', 'student')
        .order('full_name');

      if (error) throw error;
      return data;
    },
  });
}

export function useStudentSummary(studentId?: string) {
  return useQuery({
    queryKey: ['student-summary2', studentId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const [{ count: totalClasses }, { count: presentCount }] = await Promise.all([
        supabase
          .from('attendance_sessions')
          .select('*', { count: 'exact', head: true })
          .lte('attendance_date', today),
        supabase
          .from('attendance_records')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId!)
          .eq('status', 'present'),
      ]);

      const total = totalClasses ?? 0;
      const present = presentCount ?? 0;
      const absent = total - present;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      return { total_classes: total, present, absent, percentage } as StudentAttendanceSummary;
    },
    enabled: !!studentId,
  });
}

export function useDefaulters() {
  return useQuery({
    queryKey: ['defaulters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_summary')
        .select('*, profiles!attendance_summary_student_id_fkey(full_name, roll_number, email)')
        .lt('percentage', 75)
        .order('percentage', { ascending: true });

      if (error) throw error;
      return data as (StudentAttendanceSummary & { profiles: { full_name: string; roll_number: string; email: string } })[];
    },
  });
}
