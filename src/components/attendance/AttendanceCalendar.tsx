import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  present: 'bg-green-500 text-white hover:bg-green-600',
  absent: 'bg-red-500 text-white hover:bg-red-600',
  'no-session': 'bg-gray-100 text-gray-400',
  future: 'bg-white text-gray-300',
  pending: 'bg-yellow-400 text-white hover:bg-yellow-500',
  none: 'bg-white text-gray-700 hover:bg-gray-100',
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
  const startPad = firstDay.getDay(); // 0=Sun
  const days: CalendarDay[] = [];

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startPad - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ date: dateStr, day: d, status: 'none', isCurrentMonth: false, isToday: false });
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    days.push({
      date: dateStr,
      day: d,
      status: isToday ? 'none' : 'none',
      isCurrentMonth: true,
      isToday,
    });
  }

  // Next month padding
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
          <div key={name} className="text-center text-xs font-medium text-gray-500 py-1">
            {name}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const status = getDayStatus(day.date);
          return (
            <button
              key={day.date}
              onClick={() => onDayClick?.(day.date, status)}
              disabled={!day.isCurrentMonth}
              className={cn(
                'aspect-square flex items-center justify-center text-sm rounded-lg transition-colors',
                day.isCurrentMonth ? statusColors[status] || statusColors.none : 'text-gray-300',
                day.isToday && status === 'none' && 'ring-2 ring-primary-500 ring-inset',
                day.isCurrentMonth && 'cursor-pointer'
              )}
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
        className="p-1.5 rounded-lg hover:bg-gray-100"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>
      <span className="text-base font-semibold text-gray-900">{monthName}</span>
      <button
        onClick={() => {
          const newMonth = month === 11 ? 0 : month + 1;
          const newYear = month === 11 ? year + 1 : year;
          onChange(newYear, newMonth);
        }}
        className="p-1.5 rounded-lg hover:bg-gray-100"
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}
