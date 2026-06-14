import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionByCode, useAutoExpireSessions } from '@/hooks/useSessions';
import { useTodayAttendance, useMarkAttendance } from '@/hooks/useAttendance';
import { checkGeofence } from '@/hooks/useAttendance';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import type { GeofenceResult } from '@/types';
import {
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  Target,
  Fingerprint,
} from 'lucide-react';

function isSessionExpired(session: { attendance_date: string; end_time: string }): boolean {
  const now = new Date();
  const sessionDate = new Date(session.attendance_date + 'T' + session.end_time);
  return now > sessionDate;
}

export default function Attendance() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionCode = searchParams.get('session');
  const autoExpire = useAutoExpireSessions();

  const { data: session, isLoading: sessionLoading, error: sessionError } = useSessionByCode(sessionCode);
  const { data: todayRecord, isLoading: todayLoading } = useTodayAttendance(profile?.id);
  const markAttendance = useMarkAttendance();

  const [geofence, setGeofence] = useState<GeofenceResult | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [marked, setMarked] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    checkGeofence()
      .then(setGeofence)
      .catch((err) => setGeoError(err.message))
      .finally(() => setGeoLoading(false));
  }, []);

  // Auto-expire session if past end_time
  useEffect(() => {
    if (session && session.is_active && isSessionExpired(session)) {
      autoExpire.mutate();
    }
  }, [session]);

  const handleMarkAttendance = async () => {
    if (!geofence || !sessionCode || marking) return;
    setMarking(true);
    try {
      await markAttendance.mutateAsync({
        session_code: sessionCode,
        latitude: geofence.collegeLat || 0,
        longitude: geofence.collegeLng || 0,
      });
      setMarked(true);
    } catch {
      // error handled by mutation
    } finally {
      setMarking(false);
    }
  };

  const alreadyMarked = todayRecord || marked;
  const expired = session && !session.is_active && isSessionExpired(session);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 animate-fade-in-up">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/20">
            <Fingerprint className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-[#111827]">Mark Attendance</h1>
          <p className="text-sm text-[#6B7280] mt-1">Verify your location to mark presence</p>
        </div>

        {/* Session Info */}
        <Card hover={false}>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6B7280]">Session</span>
              {sessionLoading ? (
                <Spinner size="sm" />
              ) : session ? (
                <Badge variant="success">{session.session_code}</Badge>
              ) : sessionError ? (
                <Badge variant="danger">Invalid</Badge>
              ) : (
                <Badge variant="default">No Session</Badge>
              )}
            </div>
            {session && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Date</span>
                  <span className="text-sm font-medium text-[#111827]">
                    {new Date(session.attendance_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Time</span>
                  <span className="text-sm font-medium text-[#111827]">
                    {session.start_time?.slice(0, 5)} — {session.end_time?.slice(0, 5)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Status</span>
                  <Badge variant={session.is_active ? 'success' : 'danger'}>
                    {session.is_active ? 'Active' : 'Expired'}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Geolocation Status */}
        <Card hover={false}>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-[#111827]">Location Verification</span>
            </div>

            {geoLoading ? (
              <div className="flex items-center gap-2 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-[#6B7280]">Detecting your location...</span>
              </div>
            ) : geoError ? (
              <div className="flex items-start gap-2 p-3 rounded-btn bg-red-50">
                <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-danger">Location Error</p>
                  <p className="text-xs text-red-600 mt-0.5">{geoError}</p>
                </div>
              </div>
            ) : geofence?.withinGeofence ? (
              <div className="flex items-center gap-2 p-3 rounded-btn bg-green-50">
                <CheckCircle className="w-4 h-4 text-success" />
                <div>
                  <p className="text-sm font-medium text-success">Within Campus</p>
                  <p className="text-xs text-green-600">{geofence.distance}m from center</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 rounded-btn bg-red-50">
                <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-danger">Outside Campus</p>
                  <p className="text-xs text-red-600">{geofence?.distance}m away (max: {geofence?.maxDistance}m)</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mark Attendance Button */}
        {session?.is_active && !alreadyMarked && !expired ? (
          <Button
            size="lg"
            className="w-full h-14 text-base"
            onClick={handleMarkAttendance}
            disabled={!geofence?.withinGeofence || marking || !sessionCode}
            isLoading={marking}
          >
            {marking ? 'Marking...' : <><Target className="w-5 h-5" /> Mark Attendance</>}
          </Button>
        ) : alreadyMarked ? (
          <Card hover={false} className="border-2 border-green-200">
            <CardContent className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-2" />
              <p className="text-lg font-semibold text-success">Attendance Marked</p>
              <p className="text-sm text-[#6B7280] mt-1">You have been marked present for this session</p>
            </CardContent>
          </Card>
        ) : !sessionCode ? (
          <Card hover={false}>
            <CardContent className="text-center py-6">
              <Clock className="w-12 h-12 text-[#D1D5DB] mx-auto mb-2" />
              <p className="text-sm text-[#6B7280]">No session link detected</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Use a valid attendance link from your professor</p>
            </CardContent>
          </Card>
        ) : (expired || (session && !session.is_active)) ? (
          <Card hover={false} className="border-2 border-amber-200">
            <CardContent className="text-center py-6">
              <Clock className="w-12 h-12 text-warning mx-auto mb-2" />
              <p className="text-lg font-semibold text-warning">Session Expired</p>
              <p className="text-sm text-[#6B7280] mt-2">
                This session ended at {session?.end_time?.slice(0, 5)}. If you were present, submit a correction request.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-[#6B7280] hover:text-primary transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
