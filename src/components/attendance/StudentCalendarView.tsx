import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyAttendance } from '@/hooks/useAttendance';
import { useMyCorrectionRequests } from '@/hooks/useCorrectionRequests';
import { useSchedule } from '@/hooks/useSchedule';
import { Card, CardContent } from '@/components/ui/Card';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { CorrectionRequestModal } from './CorrectionRequestModal';

export function StudentCalendarView() {
  const { profile } = useAuth();
  const { data: records } = useMyAttendance(profile?.id);
  const { data: corrections } = useMyCorrectionRequests(profile?.id);
  const { data: schedule } = useSchedule();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const todayStr = new Date().toISOString().split('T')[0];
  const pastScheduleDates = new Set(
    (schedule || [])
      .filter((s) => s.date <= todayStr)
      .map((s) => s.date)
  );
  const recordsPresent = new Set<string>();
  const recordsAbsent = new Set<string>();
  records?.forEach((r) => {
    if (r.status === 'present') recordsPresent.add(r.attendance_date);
    else recordsAbsent.add(r.attendance_date);
  });
  const presentMap = new Set(recordsPresent);
  const absentMap = new Map<string, 'absent' | 'correction-pending' | 'correction-approved' | 'correction-rejected'>();
  for (const d of recordsAbsent) absentMap.set(d, 'absent');
  for (const d of pastScheduleDates) {
    if (!recordsPresent.has(d) && !absentMap.has(d)) {
      absentMap.set(d, 'absent');
    }
  }
  corrections?.forEach((c) => {
    if (c.date && absentMap.has(c.date)) {
      absentMap.set(c.date, c.status === 'pending' ? 'correction-pending' : c.status === 'approved' ? 'correction-approved' : 'correction-rejected');
    }
  });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getDayStyle = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const status = absentMap.get(dateStr);
    if (presentMap.has(dateStr)) return 'bg-success/10 text-success';
    if (status === 'correction-pending') return 'bg-warning/10 text-warning';
    if (status === 'correction-approved') return 'bg-success/10 text-success';
    if (status === 'correction-rejected') return 'bg-danger/20 text-danger';
    if (status === 'absent') return 'bg-danger/10 text-danger';
    if (day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()) return 'bg-primary-50 text-primary';
    return 'hover:bg-gray-50 text-[#111827]';
  };

  const getDayTitle = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (presentMap.has(dateStr)) return 'Present';
    const status = absentMap.get(dateStr);
    if (status === 'correction-pending') return 'Correction Pending';
    if (status === 'correction-approved') return 'Corrected - Approved';
    if (status === 'correction-rejected') return 'Correction Rejected';
    if (status === 'absent') return 'Absent - Tap to request correction';
    return 'No record';
  };

  const canRequestCorrection = (dateStr: string) => {
    const status = absentMap.get(dateStr);
    return status === 'absent' || status === 'correction-rejected';
  };

  return (
    <>
      <Card>
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
                    if (canRequestCorrection(dateStr)) setShowCorrection(true);
                  }}
                  className={`aspect-square rounded-btn text-xs font-medium transition-colors ${getDayStyle(day)}`}
                  title={getDayTitle(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-[#6B7280]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-success/60" /> Present</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-danger/60" /> Absent</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-warning/60" /> Pending</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-danger/40" /> Rejected</span>
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
