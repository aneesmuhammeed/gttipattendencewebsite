import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Holiday {
  id: string;
  date: string;
  reason: string;
  created_by: string | null;
  created_at: string;
}

export function useHolidays() {
  return useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data as Holiday[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, reason }: { date: string; reason: string }) => {
      await supabase.rpc('delete_schedule_date', { p_date: date });

      const { data, error } = await supabase
        .from('holidays')
        .insert({ date, reason })
        .select()
        .single();
      if (error) throw error;

      return data as Holiday;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['student-summary2'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-absent-records'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('holidays').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['student-summary2'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-absent-records'] });
    },
  });
}
