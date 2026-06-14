import { useAttendanceTrend } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function AttendanceTrend() {
  const { profile } = useAuth();
  const { data: days, isLoading } = useAttendanceTrend(profile?.role === 'student' ? profile?.id : undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Trend (30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-[#9CA3AF] text-center py-4">Loading...</p>
        ) : !days?.length ? (
          <p className="text-sm text-[#9CA3AF] text-center py-4">No data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-0.5 h-28">
              {days.map((d) => {
                const height = Math.max(d.percentage, 2);
                const color = d.percentage >= 75 ? '#22C55E' : d.percentage >= 50 ? '#F59E0B' : '#EF4444';
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center group relative min-w-[4px]"
                    title={`${d.date}: ${d.percentage}% (${d.present}/${d.total})`}
                  >
                    <div
                      className="w-full rounded-t transition-all min-h-[2px]"
                      style={{ height: `${height * 1.2}%`, backgroundColor: color }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-[#9CA3AF]">
              <span>{days[0]?.date?.slice(5)}</span>
              <span>{days[days.length - 1]?.date?.slice(5)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
