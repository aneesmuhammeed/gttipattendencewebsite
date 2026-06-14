import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AttendanceRecord, GeofenceResult } from '@/types';
import { calculateDistance } from '@/lib/utils';
import toast from 'react-hot-toast';

export function useAttendanceRecords(sessionId?: string) {
  return useQuery({
    queryKey: ['attendance-records', sessionId],
    queryFn: async () => {
      let query = supabase
        .from('attendance_records')
        .select('*, profiles!attendance_records_student_id_fkey(full_name, roll_number)')
        .order('marked_at', { ascending: false });

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (AttendanceRecord & { profiles: { full_name: string; roll_number: string } })[];
    },
    enabled: !!sessionId,
  });
}

export function useMyAttendance(studentId?: string) {
  return useQuery({
    queryKey: ['my-attendance', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*, attendance_sessions!inner(session_code)')
        .eq('student_id', studentId!)
        .order('attendance_date', { ascending: false });

      if (error) throw error;
      return data as (AttendanceRecord & { attendance_sessions: { session_code: string } })[];
    },
    enabled: !!studentId,
  });
}

export function useTodayAttendance(studentId?: string) {
  return useQuery({
    queryKey: ['today-attendance', studentId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId!)
        .eq('attendance_date', today)
        .maybeSingle();

      if (error) throw error;
      return data as AttendanceRecord | null;
    },
    enabled: !!studentId,
  });
}

async function getCollegeSettings() {
  const { data, error } = await supabase
    .from('college_settings')
    .select('*')
    .limit(1)
    .single();
  if (error) throw error;
  return data;
}

export async function checkGeofence(): Promise<GeofenceResult> {
  const settings = await getCollegeSettings();

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const distance = calculateDistance(
          position.coords.latitude,
          position.coords.longitude,
          settings.latitude,
          settings.longitude
        );

        resolve({
          withinGeofence: distance <= settings.geofence_radius_meters,
          distance: Math.round(distance),
          maxDistance: settings.geofence_radius_meters,
          collegeLat: settings.latitude,
          collegeLng: settings.longitude,
        });
      },
      (err) => {
        reject(new Error(`Geolocation error: ${err.message}`));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      session_code,
      latitude,
      longitude,
    }: {
      session_code: string;
      latitude: number;
      longitude: number;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { data, error } = await supabase.functions.invoke('validate-attendance', {
        body: { session_code, latitude, longitude },
      });

      if (error) {
        const errorBody = await error.context?.json() || { error: error.message };
        throw new Error(errorBody.error || error.message);
      }

      return data;
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      toast.success('Attendance marked successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
    },
  });
}
