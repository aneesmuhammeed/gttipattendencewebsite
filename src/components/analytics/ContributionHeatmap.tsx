import { useAttendanceTrend } from '@/hooks/useAnalytics';
import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { motion } from 'framer-motion';

interface ContributionHeatmapProps {
  data?: { date: string; percentage: number; present: number; total: number }[];
  isLoading?: boolean;
}

type DayStatus = 'present' | 'absent' | 'no-session' | 'correction-pending';

export function ContributionHeatmap({ data, isLoading }: ContributionHeatmapProps) {
  const heatmapData = useMemo(() => {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    const dayMap = new Map<string, DayStatus>();
    if (data) {
      for (const d of data) {
        if (d.total > 0) {
          dayMap.set(d.date, d.percentage >= 75 ? 'present' : 'absent');
        } else {
          dayMap.set(d.date, 'no-session');
        }
      }
    }

    const weeks: { date: string; status: DayStatus }[][] = [];
    let currentWeek: { date: string; status: DayStatus }[] = [];

    const cursor = new Date(oneYearAgo);
    cursor.setDate(cursor.getDate() - cursor.getDay());

    while (cursor <= today) {
      const dateStr = cursor.toISOString().split('T')[0];
      const status = dayMap.get(dateStr) || 'no-session';
      currentWeek.push({ date: dateStr, status });

      if (cursor.getDay() === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    return weeks;
  }, [data]);

  const getColor = (status: DayStatus) => {
    switch (status) {
      case 'present': return 'bg-success';
      case 'absent': return 'bg-danger';
      case 'no-session': return 'bg-gray-100';
      case 'correction-pending': return 'bg-warning';
    }
  };

  const monthLabels = useMemo(() => {
    const labels: { index: number; label: string }[] = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
      const weekIndex = Math.floor((dayOfYear - new Date(d.getFullYear(), 0, 1).getDay() + 10) / 7);
      labels.push({ index: weekIndex, label: d.toLocaleDateString('en-US', { month: 'short' }) });
    }
    return labels;
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Attendance Activity</CardTitle></CardHeader>
        <CardContent><div className="h-32 skeleton" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-0.5" style={{ minWidth: Math.max(heatmapData.length * 14, 700) }}>
            {heatmapData.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => (
                  <motion.div
                    key={`${wi}-${di}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (wi * 7 + di) * 0.001 }}
                    className={`w-3 h-3 rounded-sm ${getColor(day.status)} cursor-pointer hover:ring-2 hover:ring-primary/50`}
                    title={`${day.date}: ${day.status}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-[#9CA3AF]">
          <span>Less</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-gray-100" />
            <div className="w-3 h-3 rounded-sm bg-success" />
            <div className="w-3 h-3 rounded-sm bg-danger" />
            <div className="w-3 h-3 rounded-sm bg-warning" />
          </div>
          <span>More</span>
        </div>
        <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-[#9CA3AF]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-100" /> No Session</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-success" /> Present</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-danger" /> Absent</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-warning" /> Correction</span>
        </div>
      </CardContent>
    </Card>
  );
}
