import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AttendanceCorrectionRequest } from '@/types';
import toast from 'react-hot-toast';

export function useCorrectionRequests(sessionId?: string) {
  return useQuery({
    queryKey: ['correction-requests', sessionId],
    queryFn: async () => {
      let query = supabase
        .from('attendance_correction_requests')
        .select('*, profiles!attendance_correction_requests_student_id_fkey(full_name, roll_number), attendance_sessions!attendance_correction_requests_session_id_fkey(session_code, attendance_date, start_time, end_time)')
        .order('created_at', { ascending: false });

      if (sessionId) query = query.eq('session_id', sessionId);

      const { data, error } = await query;
      if (error) throw error;
      return data as AttendanceCorrectionRequest[];
    },
  });
}

export function useMyCorrectionRequests(studentId?: string) {
  return useQuery({
    queryKey: ['my-correction-requests', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_correction_requests')
        .select('*, attendance_sessions!attendance_correction_requests_session_id_fkey(session_code, attendance_date, start_time, end_time)')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AttendanceCorrectionRequest[];
    },
    enabled: !!studentId,
  });
}

export function usePendingCorrections() {
  return useQuery({
    queryKey: ['pending-corrections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_correction_requests')
        .select('*, profiles!attendance_correction_requests_student_id_fkey(full_name, roll_number), attendance_sessions!attendance_correction_requests_session_id_fkey(session_code, attendance_date, start_time, end_time)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AttendanceCorrectionRequest[];
    },
  });
}

export function useCreateCorrectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, reason }: { date: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Find a session for this date (optional)
      const { data: sessions } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('attendance_date', date)
        .limit(1);

      const sessionId = sessions?.[0]?.id || null;

      const { error } = await supabase
        .from('attendance_correction_requests')
        .insert({
          student_id: user.id,
          session_id: sessionId,
          date,
          reason,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-correction-requests'] });
      toast.success('Correction request submitted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useApproveCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('approve_correction_request', {
        request_id: requestId,
        reviewer_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['correction-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-corrections'] });
      toast.success('Correction approved');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRejectCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('reject_correction_request', {
        request_id: requestId,
        reviewer_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['correction-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-corrections'] });
      toast.success('Correction rejected');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
