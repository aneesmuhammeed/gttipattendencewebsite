import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AttendanceRecord, GeofenceResult } from '@/types';
import { calculateDistance } from '@/lib/utils';
import toast from 'react-hot-toast';

export function useMyAttendance(studentId?: string) {
  return useQuery({
    queryKey: ['my-attendance', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId!)
        .order('attendance_date', { ascending: false });

      if (error) throw error;
      return data as AttendanceRecord[];
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
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function checkGeofence(): Promise<GeofenceResult> {
  const settings = await getCollegeSettings();

  if (!settings) {
    return {
      withinGeofence: true,
      distance: 0,
      maxDistance: 0,
      collegeLat: 0,
      collegeLng: 0,
    };
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    const attempt = (highAccuracy: boolean) => {
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
          if (highAccuracy && err.code === 3) {
            attempt(false);
          } else {
            const messages: Record<number, string> = {
              1: 'Location permission denied. Please allow location access in your browser settings.',
              2: 'Location unavailable. Please try again or check your device GPS.',
              3: 'Location request timed out. Please try again.',
            };
            reject(new Error(messages[err.code] || `Geolocation error: ${err.message}`));
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 15000 : 10000,
          maximumAge: 60000,
        }
      );
    };

    attempt(true);
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      latitude,
      longitude,
    }: {
      latitude: number;
      longitude: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { data, error } = await supabase.rpc('mark_today_attendance', {
        p_student_id: user.id,
        p_latitude: latitude,
        p_longitude: longitude,
      });

      if (error) throw error;

      const messages: Record<string, string> = {
        HOLIDAY: 'Today is a holiday — no attendance required',
        ALREADY_MARKED: 'You have already marked attendance today',
        OUTSIDE_GEOFENCE: 'You are outside the campus geofence',
        SUCCESS: 'Attendance marked successfully!',
      };

      if (data !== 'SUCCESS') {
        throw new Error(messages[data as string] || 'Failed to mark attendance');
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
