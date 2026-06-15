import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AttendanceCorrectionRequest } from '@/types';
import toast from 'react-hot-toast';

export function useCorrectionRequests() {
  return useQuery({
    queryKey: ['correction-requests'],
    queryFn: async () => {
      let query = supabase
        .from('attendance_correction_requests')
        .select('*, profiles!attendance_correction_requests_student_id_fkey(full_name, roll_number)')
        .order('created_at', { ascending: false });

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
        .select('*')
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
        .select('*, profiles!attendance_correction_requests_student_id_fkey(full_name, roll_number)')
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

      const { data: record } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('student_id', user.id)
        .eq('attendance_date', date)
        .maybeSingle();

      if (record?.status === 'present') throw new Error('You are already marked present for this date');

      if (!record) {
        const { data: schedule } = await supabase
          .from('attendance_schedule')
          .select('date')
          .eq('date', date)
          .lte('date', new Date().toISOString().split('T')[0])
          .maybeSingle();
        if (!schedule) throw new Error('You can only request a correction for a date where you were marked absent');
      }

      const { error } = await supabase
        .from('attendance_correction_requests')
        .insert({
          student_id: user.id,
          date,
          reason,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-correction-requests'] });
      queryClient.invalidateQueries({ queryKey: ['correction-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-corrections'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['my-correction-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['student-summary2'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['my-correction-requests'] });
      toast.success('Correction rejected');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
