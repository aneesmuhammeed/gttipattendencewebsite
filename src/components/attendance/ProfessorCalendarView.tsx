import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export function ProfessorCalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getDayBadge = (day: number) => {
    const today = new Date();
    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      return <Badge variant="info">Today</Badge>;
    }
    return null;
  };

  return (
    <Card hover={false}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary" />
          Attendance Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 rounded-btn hover:bg-gray-100 text-[#6B7280]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-base font-semibold text-[#111827]">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-btn hover:bg-gray-100 text-[#6B7280]">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-xs font-semibold text-[#9CA3AF] py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            return (
              <div
                key={day}
                className="aspect-square rounded-btn p-1 border border-gray-100 hover:border-primary/30 transition-colors cursor-pointer relative flex flex-col items-center justify-center"
              >
                <span className="text-sm font-medium text-[#111827]">{day}</span>
                {getDayBadge(day)}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
