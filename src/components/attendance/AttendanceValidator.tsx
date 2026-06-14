import { useState } from 'react';
import { useSessionByCode } from '@/hooks/useSessions';
import { useMarkAttendance } from '@/hooks/useAttendance';
import { GeofenceChecker } from './GeofenceChecker';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatTime, formatDate } from '@/lib/utils';
import { CheckCircle, XCircle, Clock, MapPin } from 'lucide-react';
import type { GeofenceResult } from '@/types';
import toast from 'react-hot-toast';

interface AttendanceValidatorProps {
  sessionCode: string;
}

export function AttendanceValidator({ sessionCode }: AttendanceValidatorProps) {
  const { data: session, isLoading, error: sessionError } = useSessionByCode(sessionCode);
  const markAttendance = useMarkAttendance();
  const [geofenceResult, setGeofenceResult] = useState<GeofenceResult | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) return <PageSpinner />;

  if (sessionError || !session) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="text-center py-8">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Not Found</h2>
          <p className="text-gray-500">The attendance session you are looking for does not exist.</p>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Attendance Marked!</h2>
          <p className="text-gray-500">Your attendance has been recorded successfully.</p>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const currentTime = now.toTimeString().split(' ')[0];
  const today = now.toISOString().split('T')[0];
  const isExpired = today > session.attendance_date || (today === session.attendance_date && currentTime > session.end_time);
  const isNotStarted = today === session.attendance_date && currentTime < session.start_time;
  const isActive = session.is_active && today === session.attendance_date && currentTime >= session.start_time && currentTime <= session.end_time;

  if (isExpired || !session.is_active) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="text-center py-8">
          <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Attendance Session Expired</h2>
          <p className="text-gray-500">
            {!session.is_active
              ? 'This session has been deactivated by the instructor.'
              : 'The time window for this session has passed.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isNotStarted) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="text-center py-8">
          <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Not Yet Started</h2>
          <p className="text-gray-500">This session starts at {formatTime(session.start_time)}.</p>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async () => {
    if (!geofenceResult?.withinGeofence) {
      toast.error('You must be inside the campus geofence to mark attendance');
      return;
    }

    if (sessionCode && geofenceResult) {
      const success = await markAttendance.mutateAsync({
        session_code: sessionCode,
        latitude: geofenceResult.collegeLat,
        longitude: geofenceResult.collegeLng,
      }).catch(() => null);

      if (success) setSubmitted(true);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Mark Attendance</CardTitle>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="success">Active</Badge>
          <Badge variant="info">Code: {session.session_code}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600 space-y-1">
          <p>Date: {formatDate(session.attendance_date)}</p>
          <p>Time: {formatTime(session.start_time)} - {formatTime(session.end_time)}</p>
        </div>

        <GeofenceChecker
          onResult={setGeofenceResult}
          onError={() => {}}
        />

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          isLoading={markAttendance.isPending}
          disabled={!geofenceResult?.withinGeofence || markAttendance.isPending}
        >
          <MapPin className="w-5 h-5 mr-2" />
          Mark Attendance
        </Button>
      </CardContent>
    </Card>
  );
}
