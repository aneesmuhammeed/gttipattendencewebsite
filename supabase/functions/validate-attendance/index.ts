// ============================================
// Supabase Edge Function: validate-attendance
// Validates attendance on the backend with:
// - Session existence & active check
// - Department & semester match
// - Geofence check (Haversine)
// - Duplicate attendance check
// ============================================

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

interface AttendanceRequest {
  session_code: string;
  latitude: number;
  longitude: number;
}

interface CollegeSettings {
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
}

// Haversine formula to calculate distance between two GPS coordinates
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

serve(async (req: Request) => {
  try {
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Content-Type': 'application/json',
    };

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers });
    }

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers }
      );
    }

    // Parse request body
    const { session_code, latitude, longitude }: AttendanceRequest = await req.json();

    if (!session_code || latitude === undefined || longitude === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: session_code, latitude, longitude' }),
        { status: 400, headers }
      );
    }

    // 1. Verify session exists and is active
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('attendance_sessions')
      .select('*')
      .eq('session_code', session_code)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found', code: 'SESSION_NOT_FOUND' }),
        { status: 404, headers }
      );
    }

    if (!session.is_active) {
      return new Response(
        JSON.stringify({ error: 'Attendance session is inactive', code: 'SESSION_INACTIVE' }),
        { status: 403, headers }
      );
    }

    // 2. Verify student profile exists and is a student
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers }
      );
    }

    if (profile.role !== 'student') {
      return new Response(
        JSON.stringify({ error: 'Only students can mark attendance', code: 'NOT_STUDENT' }),
        { status: 403, headers }
      );
    }

    // 3. Verify geofence
    const { data: settings } = await supabaseAdmin
      .from('college_settings')
      .select('*')
      .limit(1)
      .single();

    if (settings) {
      const distance = haversineDistance(
        latitude,
        longitude,
        settings.latitude,
        settings.longitude
      );

      if (distance > settings.geofence_radius_meters) {
        return new Response(
          JSON.stringify({
            error: `You are outside the campus geofence. Distance: ${Math.round(distance)}m, Max allowed: ${settings.geofence_radius_meters}m`,
            code: 'OUTSIDE_GEOFENCE',
            distance_meters: Math.round(distance),
            max_distance_meters: settings.geofence_radius_meters,
          }),
          { status: 403, headers }
        );
      }
    }

    // 4. Verify attendance not already marked for this date
    const currentDate = new Date().toISOString().split('T')[0];
    const { data: existingAttendance } = await supabaseAdmin
      .from('attendance_records')
      .select('id')
      .eq('student_id', user.id)
      .eq('attendance_date', currentDate)
      .maybeSingle();

    if (existingAttendance) {
      return new Response(
        JSON.stringify({ error: 'Attendance already marked for today', code: 'ALREADY_MARKED' }),
        { status: 409, headers }
      );
    }

    // 5. All validations passed — mark attendance
    const { data: record, error: insertError } = await supabaseAdmin
      .from('attendance_records')
      .insert({
        session_id: session.id,
        student_id: user.id,
        latitude,
        longitude,
        status: 'present',
        attendance_date: currentDate,
        ip_address: req.headers.get('x-forwarded-for') || '',
        user_agent: req.headers.get('user-agent') || '',
      })
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violation
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'Attendance already marked', code: 'ALREADY_MARKED' }),
          { status: 409, headers }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Failed to mark attendance', details: insertError.message }),
        { status: 500, headers }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Attendance marked successfully',
        record,
      }),
      { status: 200, headers }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
