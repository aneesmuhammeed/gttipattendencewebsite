import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AttendanceSession } from '@/types';
import { generateSessionCode } from '@/lib/utils';

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('*, profiles!attendance_sessions_created_by_fkey(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (AttendanceSession & { profiles: { full_name: string } })[];
    },
  });
}

export function useSessionByCode(code: string | null) {
  return useQuery({
    queryKey: ['session', code],
    queryFn: async () => {
      if (!code) throw new Error('No session code');
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('session_code', code)
        .maybeSingle();
      if (error) throw error;
      return data as AttendanceSession | null;
    },
    enabled: !!code,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: {
      attendance_date: string;
      start_time: string;
      end_time: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const sessionCode = generateSessionCode();

      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          session_code: sessionCode,
          attendance_date: session.attendance_date,
          start_time: session.start_time,
          end_time: session.end_time,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, session_code: sessionCode } as AttendanceSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useToggleSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (is_active) {
        // Activating: simple update
        const { error } = await supabase
          .from('attendance_sessions')
          .update({ is_active: true })
          .eq('id', id);
        if (error) throw error;
      } else {
        // Deactivating: call RPC to mark absent for all unmarked students
        const { error } = await supabase.rpc('expire_session_and_mark_absent', {
          p_session_id: id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
    },
  });
}

export function useAutoExpireSessions() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('expire_all_past_sessions');
      if (error) throw error;
      return data as number;
    },
  });
}
