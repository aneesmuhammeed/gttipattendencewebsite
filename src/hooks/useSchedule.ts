import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ScheduleEntry {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  created_by: string | null;
  created_at: string;
}

export function useSchedule() {
  return useQuery({
    queryKey: ['schedule'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_schedule')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data as ScheduleEntry[];
    },
  });
}

export function useUpcomingSchedule() {
  return useQuery({
    queryKey: ['schedule-upcoming'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance_schedule')
        .select('*')
        .gte('date', today)
        .order('date', { ascending: true });
      if (error) throw error;
      return data as ScheduleEntry[];
    },
  });
}

export function useSetSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, start_time, end_time }: { date: string; start_time: string; end_time: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('attendance_schedule')
        .upsert({ date, start_time, end_time, created_by: user.id }, { onConflict: 'date' })
        .select()
        .single();
      if (error) throw error;
      return data as ScheduleEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['student-summary2'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useRemoveSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('attendance_schedule').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['student-summary2'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useAutoExpire() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('expire_past_schedules');
      if (error) throw error;
      return data as number;
    },
  });
}
