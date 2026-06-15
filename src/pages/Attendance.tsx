import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoExpire, useSchedule } from '@/hooks/useSchedule';
import { useTodayAttendance, useMarkAttendance } from '@/hooks/useAttendance';
import { checkGeofence } from '@/hooks/useAttendance';
import { useHolidays } from '@/hooks/useHolidays';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import type { GeofenceResult } from '@/types';
import {
  CheckCircle, XCircle, AlertTriangle, Clock, Loader2, Target, Fingerprint, Calendar,
} from 'lucide-react';

export default function Attendance() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const autoExpire = useAutoExpire();
  const expiredRef = useRef(false);

  const { data: todayRecord, isLoading: todayLoading } = useTodayAttendance(profile?.id);
  const { data: holidays } = useHolidays();
  const { data: schedule, isLoading: scheduleLoading } = useSchedule();
  const markAttendance = useMarkAttendance();

  const [geofence, setGeofence] = useState<GeofenceResult | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [marked, setMarked] = useState(false);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const isHoliday = holidays?.some((h) => h.date === today) ?? false;
  const todaySchedule = schedule?.find((s) => s.date === today);
  const hasSchedule = !!todaySchedule;
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const isClassExpired = todaySchedule && currentTime > todaySchedule.end_time?.slice(0, 5);
  const isClassFuture = todaySchedule && currentTime < todaySchedule.start_time?.slice(0, 5);

  useEffect(() => {
    if (expiredRef.current) return;
    expiredRef.current = true;
    autoExpire.mutate();
  }, []);

  useEffect(() => {
    checkGeofence()
      .then(setGeofence)
      .catch((err) => setGeoError(err.message))
      .finally(() => setGeoLoading(false));
  }, []);

  const alreadyMarked = todayRecord || marked;

  const handleMarkAttendance = async () => {
    if (!geofence || marking) return;
    setMarking(true);
    setMarkError(null);
    try {
      await markAttendance.mutateAsync({
        latitude: geofence.collegeLat || 0,
        longitude: geofence.collegeLng || 0,
      });
      setMarked(true);
    } catch (err: any) {
      setMarkError(err.message);
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 animate-fade-in-up">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/20">
            <Fingerprint className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-[#111827]">Mark Attendance</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>

        {isHoliday ? (
          <Card>
            <CardContent className="text-center py-8">
              <Clock className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <p className="text-lg font-semibold text-[#111827]">No Class Today</p>
              <p className="text-sm text-[#6B7280] mt-1">Today is marked as a holiday</p>
            </CardContent>
          </Card>
        ) : !hasSchedule ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
              <p className="text-lg font-semibold text-[#111827]">No Class Scheduled</p>
              <p className="text-sm text-[#6B7280] mt-1">There is no class scheduled for today</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : isClassFuture ? (
          <Card>
            <CardContent className="text-center py-8">
              <Clock className="w-12 h-12 text-primary mx-auto mb-3" />
              <p className="text-lg font-semibold text-[#111827]">Class Not Started</p>
              <p className="text-sm text-[#6B7280] mt-1">
                Today's class starts at {todaySchedule?.start_time?.slice(0, 5)}
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : isClassExpired ? (
          <Card>
            <CardContent className="text-center py-8">
              <XCircle className="w-12 h-12 text-danger mx-auto mb-3" />
              <p className="text-lg font-semibold text-[#111827]">Class Ended</p>
              <p className="text-sm text-[#6B7280] mt-1">
                Class ended at {todaySchedule?.end_time?.slice(0, 5)} — attendance can no longer be marked
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : alreadyMarked ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-2 border-green-200">
              <CardContent className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-success mx-auto mb-3" />
                <p className="text-lg font-semibold text-success">Present</p>
                <p className="text-sm text-[#6B7280] mt-1">You have marked attendance for today</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            <Card>
              <CardContent className="space-y-4 py-5">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold text-[#111827]">Location Verification</span>
                </div>

                {geoLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-[#6B7280]">Detecting location...</span>
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
                      <p className="text-xs text-red-600">
                        {geofence?.distance}m away (max: {geofence?.maxDistance}m)
                      </p>
                    </div>
                  </div>
                )}

                {markError && (
                  <div className="flex items-start gap-2 p-3 rounded-btn bg-red-50">
                    <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{markError}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              size="lg"
              className="w-full h-14 text-base"
              onClick={handleMarkAttendance}
              disabled={!geofence?.withinGeofence || marking}
              isLoading={marking}
            >
              {marking ? 'Marking...' : <><Target className="w-5 h-5" /> Mark Attendance</>}
            </Button>
          </>
        )}

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
