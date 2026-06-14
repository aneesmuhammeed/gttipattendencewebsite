import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { MonthlyHeatmap, DailyTrend } from '@/types';

export function useAttendanceHeatmap(studentId?: string) {
  return useQuery({
    queryKey: ['attendance-heatmap', studentId],
    queryFn: async () => {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
      twelveMonthsAgo.setDate(1);
      const startDate = twelveMonthsAgo.toISOString().split('T')[0];

      let query = supabase
        .from('attendance_records')
        .select('attendance_date, status')
        .gte('attendance_date', startDate);

      if (studentId) query = query.eq('student_id', studentId);

      const { data, error } = await query;
      if (error) throw error;

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
    queryKey: ['attendance-trend', studentId, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startStr = startDate.toISOString().split('T')[0];

      let query = supabase
        .from('attendance_records')
        .select('attendance_date, status')
        .gte('attendance_date', startStr);

      if (studentId) query = query.eq('student_id', studentId);

      query = query.order('attendance_date', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

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
