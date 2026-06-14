import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useSessionByCode } from '@/hooks/useSessions';
import { checkGeofence } from '@/hooks/useAttendance';
import { useMarkAttendance } from '@/hooks/useAttendance';
import type { GeofenceResult } from '@/types';
import { MapPin, CheckCircle, XCircle, AlertTriangle, Loader2, Target } from 'lucide-react';

interface Props {
  sessionCode: string;
}

export function AttendanceValidator({ sessionCode }: Props) {
  const { data: session, isLoading, error: sessionError } = useSessionByCode(sessionCode);
  const markAttendance = useMarkAttendance();
  const [geofence, setGeofence] = useState<GeofenceResult | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [marked, setMarked] = useState(false);

  useEffect(() => {
    checkGeofence()
      .then(setGeofence)
      .catch((err) => setGeoError(err.message))
      .finally(() => setGeoLoading(false));
  }, []);

  const handleMark = async () => {
    if (!geofence) return;
    await markAttendance.mutateAsync({
      session_code: sessionCode,
      latitude: geofence.collegeLat || 0,
      longitude: geofence.collegeLng || 0,
    });
    setMarked(true);
  };

  if (isLoading || geoLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-sm text-[#6B7280]">Validating session and location...</span>
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <Card hover={false} className="border-2 border-red-200">
        <CardContent className="flex items-center gap-3 py-4">
          <XCircle className="w-6 h-6 text-danger" />
          <div>
            <p className="font-medium text-danger">Invalid Session</p>
            <p className="text-xs text-red-600">This attendance link is invalid or expired</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session.is_active) {
    return (
      <Card hover={false} className="border-2 border-amber-200">
        <CardContent className="flex items-center gap-3 py-4">
          <AlertTriangle className="w-6 h-6 text-warning" />
          <div>
            <p className="font-medium text-warning">Session Expired</p>
            <p className="text-xs text-amber-600">This session is no longer active</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (marked) {
    return (
      <Card hover={false} className="border-2 border-green-200">
        <CardContent className="text-center py-6">
          <CheckCircle className="w-12 h-12 text-success mx-auto mb-2" />
          <p className="text-lg font-semibold text-success">Attendance Marked</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#6B7280]">Session</span>
        <Badge variant="success">{session.session_code}</Badge>
      </div>

      {geoError ? (
        <div className="flex items-start gap-2 p-3 rounded-btn bg-red-50">
          <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-danger">{geoError}</p>
        </div>
      ) : geofence?.withinGeofence ? (
        <div className="flex items-center gap-2 p-3 rounded-btn bg-green-50">
          <CheckCircle className="w-4 h-4 text-success" />
          <span className="text-sm text-success">Within campus ({geofence.distance}m)</span>
        </div>
      ) : (
        <div className="flex items-start gap-2 p-3 rounded-btn bg-red-50">
          <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-danger">Outside Campus</p>
            <p className="text-xs text-red-600">{geofence?.distance}m away</p>
          </div>
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={handleMark}
        disabled={!geofence?.withinGeofence}
        isLoading={markAttendance.isPending}
      >
        <Target className="w-5 h-5" /> Mark Attendance
      </Button>
    </div>
  );
}
