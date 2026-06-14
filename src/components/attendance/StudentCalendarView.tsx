import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AttendanceCalendar, CalendarNavigator, type DayStatus } from './AttendanceCalendar';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CorrectionRequestModal } from './CorrectionRequestModal';
import { Calendar, AlertCircle, CheckCircle } from 'lucide-react';

export function StudentCalendarView() {
  const { profile } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const { data: records } = useQuery({
    queryKey: ['student-calendar', profile?.id, monthStr],
    queryFn: async () => {
      if (!profile?.id) return [];
      const startDate = `${monthStr}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;
      const { data, error } = await supabase
        .from('attendance_records')
        .select('attendance_date, status')
        .eq('student_id', profile.id)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const { data: sessions } = useQuery({
    queryKey: ['session-dates', monthStr],
    queryFn: async () => {
      const startDate = `${monthStr}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('attendance_date')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);
      if (error) throw error;
      return new Set((data || []).map((s) => s.attendance_date));
    },
    enabled: true,
  });

  const attendanceByDate: Record<string, string> = {};
  for (const r of records || []) {
    attendanceByDate[r.attendance_date] = r.status;
  }

  const getDayStatus = (dateStr: string): DayStatus => {
    const todayStr = today.toISOString().split('T')[0];
    if (dateStr > todayStr) return 'future';
    const status = attendanceByDate[dateStr];
    if (status === 'present') return 'present';
    if (status === 'absent') return 'absent';
    if (sessions?.has(dateStr)) return 'absent';
    return 'no-session';
  };

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardContent>
          <CalendarNavigator year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); setSelectedDate(null); }} />
          <AttendanceCalendar
            year={year}
            month={month}
            getDayStatus={getDayStatus}
            onDayClick={(date, status) => {
              setSelectedDate(date);
              if (status === 'absent') setShowCorrection(true);
            }}
          />
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Present</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Absent</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> No Session</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-600" />
            {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
          </h3>
          {!selectedDate ? (
            <p className="text-sm text-gray-500 text-center py-8">Click a date on the calendar to see details.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge variant={getDayStatus(selectedDate) === 'present' ? 'success' : getDayStatus(selectedDate) === 'absent' ? 'danger' : 'default'}>
                  {getDayStatus(selectedDate) === 'present' ? 'Present' : getDayStatus(selectedDate) === 'absent' ? 'Absent' : 'No Session'}
                </Badge>
              </div>
              {getDayStatus(selectedDate) === 'absent' && (
                <Button className="w-full" onClick={() => setShowCorrection(true)}>
                  <AlertCircle className="w-4 h-4 mr-2" /> Request Correction / Leave
                </Button>
              )}
              {getDayStatus(selectedDate) === 'present' && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" /> Marked present
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CorrectionRequestModal
        isOpen={showCorrection}
        onClose={() => setShowCorrection(false)}
        preselectedDate={selectedDate}
      />
    </div>
  );
}
