import { useAttendanceHeatmap } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BarChart3 } from 'lucide-react';

export function AttendanceHeatmap() {
  const { data: months, isLoading } = useAttendanceHeatmap();

  const getBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-green-500';
    if (pct >= 75) return 'bg-emerald-400';
    if (pct >= 60) return 'bg-yellow-400';
    if (pct >= 40) return 'bg-orange-400';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary-600" />
          Attendance Heatmap (Monthly)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : !months?.length ? (
          <p className="text-sm text-gray-500">No data available.</p>
        ) : (
          <div className="space-y-2">
            {months.map((m) => {
              const barColor = getBarColor(m.percentage);
              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16 shrink-0">
                    {new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                  </span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${m.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600 w-12 text-right">
                    {m.percentage}%
                  </span>
                  <span className="text-xs text-gray-400 w-16 text-right">
                    {m.present}/{m.total}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
