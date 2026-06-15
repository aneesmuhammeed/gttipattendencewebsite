import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyAttendance } from '@/hooks/useAttendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle, XCircle } from 'lucide-react';
import { CorrectionRequestModal } from './CorrectionRequestModal';

export function StudentCalendarView() {
  const { profile } = useAuth();
  const { data: records } = useMyAttendance(profile?.id);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const absentMap = new Set<string>();
  const presentMap = new Set<string>();
  records?.forEach((r) => {
    if (r.status === 'present') presentMap.add(r.attendance_date);
    else absentMap.add(r.attendance_date);
  });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getDayColor = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (presentMap.has(dateStr)) return 'bg-success/10 text-success';
    if (absentMap.has(dateStr)) return 'bg-danger/10 text-danger';
    if (day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()) return 'bg-primary-50 text-primary';
    return 'hover:bg-gray-50 text-[#111827]';
  };

  return (
    <>
      <Card hover={false}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1 rounded-btn hover:bg-gray-100 text-[#6B7280]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-[#111827]">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="p-1 rounded-btn hover:bg-gray-100 text-[#6B7280]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="text-[10px] font-semibold text-[#9CA3AF] py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              return (
                <button
                  key={day}
                  onClick={() => {
                    setSelectedDate(dateStr);
                    if (absentMap.has(dateStr)) setShowCorrection(true);
                  }}
                  className={`aspect-square rounded-btn text-xs font-medium transition-colors ${getDayColor(day)}`}
                  title={presentMap.has(dateStr) ? 'Present' : absentMap.has(dateStr) ? 'Absent' : 'No record'}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-[#6B7280]">
            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-success" /> Present</span>
            <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-danger" /> Absent</span>
          </div>
        </CardContent>
      </Card>

      {showCorrection && selectedDate && (
        <CorrectionRequestModal
          isOpen={showCorrection}
          onClose={() => setShowCorrection(false)}
          preselectedDate={selectedDate}
        />
      )}
    </>
  );
}
