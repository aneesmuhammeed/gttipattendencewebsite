import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CalendarCheck, BarChart3, Plus, Clock, Calendar } from 'lucide-react';
import { useSessions } from '@/hooks/useSessions';
import { ProfessorCalendarView } from '@/components/attendance/ProfessorCalendarView';

export function ProfessorDashboard() {
  const navigate = useNavigate();
  const { data: sessions } = useSessions();
  const [showCalendar, setShowCalendar] = useState(false);

  const activeSessions = sessions?.filter((s) => s.is_active) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col items-center text-center">
            <CalendarCheck className="w-10 h-10 text-primary-600 mb-3" />
            <p className="text-2xl font-bold text-gray-900">{sessions?.length ?? 0}</p>
            <p className="text-sm text-gray-500">Total Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center text-center">
            <Clock className="w-10 h-10 text-green-600 mb-3" />
            <p className="text-2xl font-bold text-gray-900">{activeSessions.length}</p>
            <p className="text-sm text-gray-500">Active Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center text-center">
            <BarChart3 className="w-10 h-10 text-purple-600 mb-3" />
            <p className="text-2xl font-bold text-gray-900">Reports</p>
            <p className="text-sm text-gray-500">View analytics</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center text-center">
            <Calendar className="w-10 h-10 text-teal-600 mb-3" />
            <p className="text-2xl font-bold text-gray-900">Calendar</p>
            <p className="text-sm text-gray-500">Daily attendance</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => navigate('/sessions')}>
          <Plus className="w-4 h-4 mr-2" /> Create Session
        </Button>
        <Button variant="outline" onClick={() => navigate('/reports')}>
          <BarChart3 className="w-4 h-4 mr-2" /> View Reports
        </Button>
        <Button variant="secondary" onClick={() => setShowCalendar(!showCalendar)}>
          <Calendar className="w-4 h-4 mr-2" /> {showCalendar ? 'Hide' : 'Show'} Calendar
        </Button>
      </div>

      {showCalendar && <ProfessorCalendarView />}

      {activeSessions.length > 0 && !showCalendar && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Active Sessions</h3>
          <div className="space-y-2">
            {activeSessions.slice(0, 5).map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{s.session_code}</p>
                  </div>
                  <span className="text-sm text-gray-400">
                    {s.attendance_date} | {s.start_time}-{s.end_time}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
