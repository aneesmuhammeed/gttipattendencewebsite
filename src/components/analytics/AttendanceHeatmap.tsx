import { useAttendanceHeatmap } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function AttendanceHeatmap() {
  const { profile } = useAuth();
  const { data: months, isLoading } = useAttendanceHeatmap(profile?.role === 'student' ? profile?.id : undefined);

  const getBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-success';
    if (pct >= 75) return 'bg-green-400';
    if (pct >= 60) return 'bg-warning';
    if (pct >= 40) return 'bg-orange-400';
    return 'bg-danger';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Attendance (Monthly)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-[#9CA3AF] text-center py-4">Loading...</p>
        ) : !months?.length ? (
          <p className="text-sm text-[#9CA3AF] text-center py-4">No data available.</p>
        ) : (
          <div className="space-y-2">
            {months.map((m) => {
              const barColor = getBarColor(m.percentage);
              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-[#6B7280] w-14 shrink-0">
                    {new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                  </span>
                  <div className="flex-1 h-5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${m.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[#111827] w-9 text-right">
                    {m.percentage}%
                  </span>
                  <span className="text-xs text-[#9CA3AF] w-12 text-right">
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
