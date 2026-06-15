import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { MonthlyHeatmap, DailyTrend } from '@/types';

export function useAttendanceHeatmap(studentId?: string) {
  return useQuery({
    queryKey: ['attendance-heatmap2', studentId],
    queryFn: async () => {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
      twelveMonthsAgo.setDate(1);
      const startDate = twelveMonthsAgo.toISOString().split('T')[0];

      if (studentId) {
        // Student-level: compare sessions vs present records
        const [sessionsResult, recordsResult] = await Promise.all([
          supabase
            .from('attendance_schedule')
            .select('date')
            .gte('date', startDate),
          supabase
            .from('attendance_records')
            .select('attendance_date, status')
            .eq('student_id', studentId)
            .gte('attendance_date', startDate),
        ]);

        const monthStats: Record<string, { present: number; total: number }> = {};
        for (let i = 0; i < 12; i++) {
          const d = new Date();
          d.setMonth(d.getMonth() - (11 - i));
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthStats[key] = { present: 0, total: 0 };
        }

        for (const s of sessionsResult.data || []) {
          const month = s.date.slice(0, 7);
          if (monthStats[month]) monthStats[month].total++;
        }

        for (const r of recordsResult.data || []) {
          const month = r.attendance_date.slice(0, 7);
          if (monthStats[month] && r.status === 'present') monthStats[month].present++;
        }

        return Object.entries(monthStats).map(([month, stats]) => ({
          month,
          percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
          present: stats.present,
          total: stats.total,
        })) as MonthlyHeatmap[];
      }

      // Admin-level: show record counts per month
      const { data } = await supabase
        .from('attendance_records')
        .select('attendance_date, status')
        .gte('attendance_date', startDate);

      const monthStats: Record<string, { present: number; total: number }> = {};
      for (let i = 0; i < 12; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (11 - i));
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthStats[key] = { present: 0, total: 0 };
      }

      for (const record of data || []) {
        const month = record.attendance_date.slice(0, 7);
        if (monthStats[month]) {
          monthStats[month].total++;
          if (record.status === 'present') monthStats[month].present++;
        }
      }

      return Object.entries(monthStats).map(([month, stats]) => ({
        month,
        percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
        present: stats.present,
        total: stats.total,
      })) as MonthlyHeatmap[];
    },
    enabled: true,
  });
}

export function useAttendanceTrend(studentId?: string, days: number = 30) {
  return useQuery({
    queryKey: ['attendance-trend2', studentId, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startStr = startDate.toISOString().split('T')[0];

      if (studentId) {
        // Student-level: compare sessions vs present records
        const [sessionsResult, recordsResult] = await Promise.all([
          supabase
            .from('attendance_schedule')
            .select('date')
            .gte('date', startStr),
          supabase
            .from('attendance_records')
            .select('attendance_date, status')
            .eq('student_id', studentId)
            .gte('attendance_date', startStr),
        ]);

        const dailyStats: Record<string, { present: number; total: number }> = {};
        for (let i = 0; i < days; i++) {
          const d = new Date();
          d.setDate(d.getDate() - (days - 1 - i));
          const key = d.toISOString().split('T')[0];
          dailyStats[key] = { present: 0, total: 0 };
        }

        for (const s of sessionsResult.data || []) {
          if (dailyStats[s.date]) dailyStats[s.date].total++;
        }

        for (const r of recordsResult.data || []) {
          if (dailyStats[r.attendance_date] && r.status === 'present') {
            dailyStats[r.attendance_date].present++;
          }
        }

        return Object.entries(dailyStats).map(([date, stats]) => ({
          date,
          percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
          present: stats.present,
          total: stats.total,
        })) as DailyTrend[];
      }

      // Admin-level: show counts per day
      const { data } = await supabase
        .from('attendance_records')
        .select('attendance_date, status')
        .gte('attendance_date', startStr)
        .order('attendance_date', { ascending: true });

      const dailyStats: Record<string, { present: number; total: number }> = {};
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        const key = d.toISOString().split('T')[0];
        dailyStats[key] = { present: 0, total: 0 };
      }

      for (const record of data || []) {
        if (dailyStats[record.attendance_date]) {
          dailyStats[record.attendance_date].total++;
          if (record.status === 'present') dailyStats[record.attendance_date].present++;
        }
      }

      return Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
        present: stats.present,
        total: stats.total,
      })) as DailyTrend[];
    },
    enabled: true,
  });
}
