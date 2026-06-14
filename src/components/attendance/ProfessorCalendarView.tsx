import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AttendanceCalendar, CalendarNavigator, type DayStatus } from './AttendanceCalendar';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { CheckCircle, XCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export function ProfessorCalendarView() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  // Fetch all attendance records for the visible month
  const { data: records, isLoading } = useQuery({
    queryKey: ['professor-calendar', monthStr],
    queryFn: async () => {
      const startDate = `${monthStr}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;
      const { data, error } = await supabase
        .from('attendance_records')
        .select('student_id, attendance_date, status, id')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all students
  const { data: students } = useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, roll_number')
        .eq('role', 'student')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch sessions for the selected date
  const { data: sessions } = useQuery({
    queryKey: ['sessions-date', selectedDate],
    queryFn: async () => {
      if (!selectedDate) return [];
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('id, session_code, start_time, end_time')
        .eq('attendance_date', selectedDate)
        .order('start_time');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDate,
  });

  // Upsert attendance mutation (professor can mark/update)
  const upsertMutation = useMutation({
    mutationFn: async ({ studentId, date, status }: { studentId: string; date: string; status: string }) => {
      // Check if record exists
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('student_id', studentId)
        .eq('attendance_date', date)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('attendance_records')
          .update({ status })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Need a session_id - use first session of the day or skip
        const { data: daySessions } = await supabase
          .from('attendance_sessions')
          .select('id')
          .eq('attendance_date', date)
          .limit(1);
        if (!daySessions?.length) throw new Error('No session exists for this date. Create a session first.');
        const { error } = await supabase
          .from('attendance_records')
          .insert({ student_id: studentId, session_id: daySessions[0].id, status, attendance_date: date, latitude: 0, longitude: 0 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['sessions-date'] });
      toast.success('Attendance updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Build a lookup: { date: { student_id: status } }
  const attendanceMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const r of records || []) {
      if (!map[r.attendance_date]) map[r.attendance_date] = {};
      map[r.attendance_date][r.student_id] = r.status;
    }
    return map;
  }, [records]);

  const getDayStatus = (dateStr: string): DayStatus => {
    const dayRecords = attendanceMap[dateStr];
    if (!dayRecords) {
      return dateStr > today.toISOString().split('T')[0] ? 'future' : 'no-session';
    }
    const presentCount = Object.values(dayRecords).filter((s) => s === 'present').length;
    const totalCount = Object.keys(dayRecords).length;
    if (presentCount === totalCount && totalCount > 0) return 'present';
    if (presentCount === 0 && totalCount > 0) return 'absent';
    if (totalCount > 0) return 'pending';
    return 'no-session';
  };

  const selectedDayRecords = selectedDate ? attendanceMap[selectedDate] || {} : {};
  const selectedDayStudents = students?.map((s) => ({
    ...s,
    status: (selectedDayRecords as any)[s.id] || 'absent',
  })) || [];

  if (isLoading) return <PageSpinner />;

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardContent>
          <CalendarNavigator year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); setSelectedDate(null); }} />
          <AttendanceCalendar
            year={year}
            month={month}
            getDayStatus={getDayStatus}
            onDayClick={(date) => setSelectedDate(date)}
          />
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Present</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Absent</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" /> Mixed</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> No Session</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-600" />
            {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Select a date'}
          </h3>
          {!selectedDate ? (
            <p className="text-sm text-gray-500 text-center py-8">Click a date on the calendar to view and manage attendance.</p>
          ) : !selectedDayStudents.length ? (
            <p className="text-sm text-gray-500 text-center py-4">No students found.</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {selectedDayStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{student.full_name}</p>
                    <p className="text-xs text-gray-500">{student.roll_number}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={student.status === 'present' ? 'primary' : 'ghost'}
                      onClick={() => upsertMutation.mutate({ studentId: student.id, date: selectedDate, status: 'present' })}
                      isLoading={upsertMutation.isPending}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant={student.status === 'absent' ? 'danger' : 'ghost'}
                      onClick={() => upsertMutation.mutate({ studentId: student.id, date: selectedDate, status: 'absent' })}
                      isLoading={upsertMutation.isPending}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {sessions && sessions.length > 0 && (
            <div className="mt-3 pt-3 border-t text-xs text-gray-400">
              Sessions this day: {sessions.map((s) => s.session_code).join(', ')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
