import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSchedule, useSetSchedule, useAutoExpire } from '@/hooks/useSchedule';
import { useHolidays, useAddHoliday, useDeleteHoliday } from '@/hooks/useHolidays';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export default function Sessions() {
  const queryClient = useQueryClient();
  const { data: schedule } = useSchedule();
  const { data: holidays } = useHolidays();
  const setSchedule = useSetSchedule();
  const addHoliday = useAddHoliday();
  const deleteHoliday = useDeleteHoliday();
  const autoExpire = useAutoExpire();
  const expiredRef = useRef(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const scheduleMap = new Map(schedule?.map((s) => [s.date, s]) ?? []);
  const holidaySet = new Set(holidays?.map((h) => h.date) ?? []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const selectedEntry = selectedDate ? scheduleMap.get(selectedDate) : undefined;
  const selectedIsHoliday = selectedDate ? holidaySet.has(selectedDate) : false;

  useEffect(() => {
    if (expiredRef.current) return;
    expiredRef.current = true;
    autoExpire.mutate();
  }, []);

  const handleDayClick = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (dateStr < today) return;
    setSelectedDate(dateStr === selectedDate ? null : dateStr);
  };

  const handleSetTime = async () => {
    if (!selectedDate || !startTime || !endTime) return;
    try {
      await setSchedule.mutateAsync({ date: selectedDate, start_time: startTime, end_time: endTime });
      toast.success('Schedule set');
      setStartTime('');
      setEndTime('');
    } catch {
      toast.error('Failed to set schedule');
    }
  };

  const handleRemoveSchedule = async () => {
    if (!selectedDate) return;
    try {
      await supabase.rpc('delete_schedule_date', { p_date: selectedDate });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['student-summary2'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setSelectedDate(null);
      toast.success('Schedule removed');
    } catch {
      toast.error('Failed to remove schedule');
    }
  };

  const handleToggleHoliday = async () => {
    if (!selectedDate) return;
    if (selectedIsHoliday) {
      const h = holidays?.find((h) => h.date === selectedDate);
      if (h) await deleteHoliday.mutateAsync(h.id);
    } else {
      await addHoliday.mutateAsync({ date: selectedDate, reason: '' });
    }
  };

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getDayColor = (dateStr: string) => {
    if (selectedDate === dateStr) return 'ring-2 ring-primary bg-primary-50';
    if (holidaySet.has(dateStr)) return 'bg-red-100 text-red-700';
    if (scheduleMap.has(dateStr)) return 'bg-green-100 text-green-700';
    return 'hover:bg-gray-100 text-[#111827]';
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="page-container max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Schedule</h1>
        <p className="page-subtitle">Tap a day to set class time or mark holiday</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-btn hover:bg-gray-100 text-[#6B7280]">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-base font-semibold text-[#111827]">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-btn hover:bg-gray-100 text-[#6B7280]">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="text-xs font-semibold text-[#9CA3AF] py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isPast = dateStr < today;
              return (
                <button
                  key={day}
                  onClick={() => !isPast && handleDayClick(dateStr)}
                  disabled={isPast}
                  className={`aspect-square rounded-lg text-sm font-medium transition-all ${getDayColor(dateStr)} ${isPast ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-5 mt-4 text-xs text-[#6B7280]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100" /> Class</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100" /> Holiday</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border" /> None</span>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4"
          >
            <Card>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#111827]">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${selectedIsHoliday ? 'bg-red-100 text-red-700' : scheduleMap.has(selectedDate) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-[#6B7280]'}`}>
                    {selectedIsHoliday ? 'Holiday' : scheduleMap.has(selectedDate) ? 'Class' : 'None'}
                  </span>
                </div>

                {selectedEntry ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6B7280] font-mono">
                      {selectedEntry.start_time?.slice(0, 5)} — {selectedEntry.end_time?.slice(0, 5)}
                    </span>
                    <button
                      onClick={handleRemoveSchedule}
                      className="p-1.5 rounded-btn text-[#9CA3AF] hover:text-danger hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : !selectedIsHoliday ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    <Button size="sm" className="col-span-2" onClick={handleSetTime} isLoading={setSchedule.isPending} disabled={!startTime || !endTime}>
                      Set Class Time
                    </Button>
                  </div>
                ) : null}

                <button
                  onClick={handleToggleHoliday}
                  className={`w-full text-xs py-2 rounded-btn transition-colors ${selectedIsHoliday ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                >
                  {selectedIsHoliday ? 'Unmark Holiday' : 'Mark as Holiday'}
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
