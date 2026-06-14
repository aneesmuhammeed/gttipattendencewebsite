import { ChevronLeft, ChevronRight } from 'lucide-react';

export type DayStatus = 'present' | 'absent' | 'no-session' | 'future' | 'pending' | 'none';

interface CalendarDay {
  date: string;
  day: number;
  status: DayStatus;
  isCurrentMonth: boolean;
  isToday: boolean;
}

interface AttendanceCalendarProps {
  year: number;
  month: number;
  getDayStatus: (dateStr: string) => DayStatus;
  onDayClick?: (dateStr: string, status: DayStatus) => void;
  onMonthChange?: (year: number, month: number) => void;
}

const statusColors: Record<DayStatus, string> = {
  present: 'bg-[#7EAC7E] text-white hover:bg-[#6B9A6B]',
  absent: 'bg-[#E8918F] text-white hover:bg-[#D47A78]',
  'no-session': 'bg-[#E8DDD9] text-[#C9AFC4]',
  future: 'bg-transparent text-[#C9AFC4]',
  pending: 'bg-[#E8C87A] text-white hover:bg-[#DAB86A]',
  none: 'bg-transparent text-[#493944] hover:bg-[#E8DDD9]',
};

const statusLabels: Record<DayStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  'no-session': 'No Session',
  future: '',
  pending: 'Pending',
  none: '',
};

export function getDaysInMonth(year: number, month: number): CalendarDay[] {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const days: CalendarDay[] = [];

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startPad - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ date: dateStr, day: d, status: 'none', isCurrentMonth: false, isToday: false });
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    days.push({ date: dateStr, day: d, status: 'none', isCurrentMonth: true, isToday });
  }

  const endPad = 42 - days.length;
  for (let d = 1; d <= endPad; d++) {
    const nextMonth = month + 1 > 11 ? 0 : month + 1;
    const nextYear = month + 1 > 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ date: dateStr, day: d, status: 'none', isCurrentMonth: false, isToday: false });
  }

  return days;
}

export function AttendanceCalendar({ year, month, getDayStatus, onDayClick }: AttendanceCalendarProps) {
  const days = getDaysInMonth(year, month);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((name) => (
          <div key={name} className="text-center text-xs font-medium py-1" style={{ color: '#9B7595' }}>
            {name}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const status = getDayStatus(day.date);
          const colorClass = day.isCurrentMonth ? statusColors[status] || statusColors.none : 'text-[#D5C8D0]';
          const todayRing = day.isToday && status === 'none' ? 'ring-2 ring-[#B48FAE] ring-inset' : '';
          return (
            <button
              key={day.date}
              onClick={() => onDayClick?.(day.date, status)}
              disabled={!day.isCurrentMonth}
              className={`aspect-square flex items-center justify-center text-sm rounded-btn transition-all duration-200 ${colorClass} ${todayRing} ${day.isCurrentMonth ? 'cursor-pointer' : ''}`}
              title={statusLabels[status] || day.date}
            >
              {day.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarNavigator({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={() => {
          const newMonth = month === 0 ? 11 : month - 1;
          const newYear = month === 0 ? year - 1 : year;
          onChange(newYear, newMonth);
        }}
        className="neu-secondary p-1.5 rounded-btn"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-semibold" style={{ color: '#493944' }}>{monthName}</span>
      <button
        onClick={() => {
          const newMonth = month === 11 ? 0 : month + 1;
          const newYear = month === 11 ? year + 1 : year;
          onChange(newYear, newMonth);
        }}
        className="neu-secondary p-1.5 rounded-btn"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
