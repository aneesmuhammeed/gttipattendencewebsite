import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ReportFilters, DashboardStats, StudentAttendanceSummary } from '@/types';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const [{ count: totalStudents }, { count: presentToday }, { count: scheduledToday }, { count: defaulters }] =
        await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
          supabase
            .from('attendance_records')
            .select('*', { count: 'exact', head: true })
            .eq('attendance_date', today),
          supabase
            .from('attendance_schedule')
            .select('*', { count: 'exact', head: true })
            .eq('date', today),
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
        scheduled_today: scheduledToday ?? 0,
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
      const { start_date, end_date, student_id } = filters;
      const defaultDate = end_date || new Date().toISOString().split('T')[0];

      let recordsQuery = supabase
        .from('attendance_records')
        .select(`
          *,
          profiles!attendance_records_student_id_fkey(full_name, roll_number)
        `);

      if (start_date) recordsQuery = recordsQuery.gte('attendance_date', start_date);
      if (end_date) recordsQuery = recordsQuery.lte('attendance_date', end_date);
      if (student_id) recordsQuery = recordsQuery.eq('student_id', student_id);

      recordsQuery = recordsQuery.order('attendance_date', { ascending: false });

      const { data: records, error: recordsError } = await recordsQuery;
      if (recordsError) throw recordsError;
      if (!records) return [];

      if (student_id) return records;

      const { data: students } = await supabase
        .from('profiles')
        .select('id, full_name, roll_number')
        .eq('role', 'student');

      if (!students) return records;

      const studentsWithRecords = new Set(records.map((r: any) => r.student_id));
      const absentStudents = students
        .filter((s) => !studentsWithRecords.has(s.id))
        .map((s) => ({
          id: `absent-${s.id}`,
          student_id: s.id,
          profiles: { full_name: s.full_name, roll_number: s.roll_number },
          status: 'absent',
          attendance_date: defaultDate,
          marked_at: null,
          latitude: 0,
          longitude: 0,
          ip_address: null,
          user_agent: null,
        }));

      return [...records, ...absentStudents].sort((a: any, b: any) => {
        const dateA = a.attendance_date || '';
        const dateB = b.attendance_date || '';
        return dateB.localeCompare(dateA);
      });
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

      const [{ count: totalClasses }, { count: presentCount }, { data: holidays }, { data: scheduleDates }] = await Promise.all([
        supabase
          .from('attendance_schedule')
          .select('*', { count: 'exact', head: true })
          .lte('date', today),
        supabase
          .from('attendance_records')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId!)
          .eq('status', 'present'),
        supabase.from('holidays').select('date'),
        supabase.from('attendance_schedule').select('date').lte('date', today),
      ]);

      const scheduleDateSet = new Set((scheduleDates ?? []).map((s: any) => s.date));
      const holidayOverlap = (holidays ?? []).filter((h: any) => scheduleDateSet.has(h.date)).length;
      const total = (totalClasses ?? 0) - holidayOverlap;
      const present = presentCount ?? 0;
      const absent = total - present;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      return { total_classes: total, present, absent, percentage } as StudentAttendanceSummary;
    },
    enabled: !!studentId,
  });
}

export function useMyAbsentRecords(studentId?: string) {
  return useQuery({
    queryKey: ['my-absent-records', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('attendance_date')
        .eq('student_id', studentId!)
        .eq('status', 'absent')
        .order('attendance_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as { attendance_date: string }[];
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
