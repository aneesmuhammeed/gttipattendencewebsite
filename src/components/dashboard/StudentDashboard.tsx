import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyAttendance, useTodayAttendance } from '@/hooks/useAttendance';
import { useStudentSummary } from '@/hooks/useReports';
import { useMyCorrectionRequests } from '@/hooks/useCorrectionRequests';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { CheckCircle, Clock, Calendar, AlertCircle, Plus } from 'lucide-react';
import { CorrectionRequestModal } from '@/components/attendance/CorrectionRequestModal';
import { AttendanceHeatmap } from '@/components/analytics/AttendanceHeatmap';
import { AttendanceTrend } from '@/components/analytics/AttendanceTrend';
import { RiskPrediction } from '@/components/analytics/RiskPrediction';
import { useRealtimeCorrections, useMissedAttendanceCheck } from '@/hooks/useNotifications';
import { StudentCalendarView } from '@/components/attendance/StudentCalendarView';

export function StudentDashboard() {
  const { profile } = useAuth();
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const { data: todayRecord, isLoading: todayLoading } = useTodayAttendance(profile?.id);
  const { data: summary, isLoading: summaryLoading } = useStudentSummary(profile?.id);
  const { data: history, isLoading: historyLoading } = useMyAttendance(profile?.id);
  const { data: myRequests } = useMyCorrectionRequests(profile?.id);
  useRealtimeCorrections(profile?.id);
  useMissedAttendanceCheck(profile?.id);

  if (todayLoading || summaryLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col items-center text-center">
            <div className={`p-3 rounded-full mb-3 ${todayRecord ? 'bg-green-100' : 'bg-gray-100'}`}>
              {todayRecord ? <CheckCircle className="w-8 h-8 text-green-600" /> : <Clock className="w-8 h-8 text-gray-400" />}
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {todayRecord ? 'Present Today' : 'Not Marked'}
            </p>
            <p className="text-sm text-gray-500">Today's Status</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center text-center">
            <div className="p-3 rounded-full bg-primary-100 mb-3">
              <Calendar className="w-8 h-8 text-primary-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900">{summary?.total_classes ?? 0}</p>
            <p className="text-sm text-gray-500">Total Classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center text-center">
            <div className={`p-3 rounded-full mb-3 ${(summary?.percentage ?? 0) >= 75 ? 'bg-green-100' : 'bg-red-100'}`}>
              <span className="text-2xl font-bold text-gray-900">{summary?.percentage ?? 0}%</span>
            </div>
            <p className="text-sm text-gray-500">Attendance</p>
            <p className="text-xs text-gray-400">
              {summary?.present ?? 0} present / {summary?.absent ?? 0} absent
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center text-center">
            <div className="p-3 rounded-full bg-yellow-100 mb-3">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900">{myRequests?.length ?? 0}</p>
            <p className="text-sm text-gray-500">Correction Requests</p>
            <p className="text-xs text-gray-400">
              {myRequests?.filter((r) => r.status === 'pending').length ?? 0} pending
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => setShowCorrectionModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> Request Correction
        </Button>
        <Button variant="secondary" onClick={() => setShowCalendar(!showCalendar)}>
          <Calendar className="w-4 h-4 mr-2" /> {showCalendar ? 'Hide' : 'Show'} Calendar
        </Button>
      </div>

      {showCalendar && <StudentCalendarView />}

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <AttendanceHeatmap />
        <RiskPrediction totalClasses={summary?.total_classes ?? 0} present={summary?.present ?? 0} />
        <div>
          <Card>
            <CardContent>
              <h3 className="font-semibold text-gray-900 mb-4">Recent Attendance</h3>
              {historyLoading ? (
                <PageSpinner />
              ) : history && history.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.slice(0, 10).map((record: any) => (
                    <div key={record.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm text-gray-500">{record.attendance_date}</p>
                      </div>
                      <Badge variant={record.status === 'present' ? 'success' : 'danger'}>
                        {record.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No attendance records yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AttendanceTrend />

      <CorrectionRequestModal isOpen={showCorrectionModal} onClose={() => setShowCorrectionModal(false)} />
    </div>
  );
}
