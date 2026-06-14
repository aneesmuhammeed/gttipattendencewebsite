import { useAttendanceTrend } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TrendingUp } from 'lucide-react';

export function AttendanceTrend() {
  const { data: days, isLoading } = useAttendanceTrend();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          Attendance Trend (Last 30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : !days?.length ? (
          <p className="text-sm text-gray-500">No data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 h-32">
              {days.map((d) => {
                const height = Math.max(d.percentage, 2);
                const color = d.percentage >= 75 ? 'bg-green-500' : d.percentage >= 50 ? 'bg-yellow-400' : 'bg-red-500';
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center group relative"
                    title={`${d.date}: ${d.percentage}% (${d.present}/${d.total})`}
                  >
                    <div
                      className={`w-full rounded-t ${color} transition-all min-h-[2px]`}
                      style={{ height: `${height * 1.2}%` }}
                    />
                    <span className="text-[8px] text-gray-400 mt-0.5 hidden sm:block">
                      {new Date(d.date).getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
