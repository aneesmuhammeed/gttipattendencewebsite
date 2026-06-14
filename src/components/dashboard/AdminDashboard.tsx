import { useDashboardStats } from '@/hooks/useReports';
import { Card, CardContent } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { Users, UserCheck, UserX, TrendingUp, CalendarCheck, AlertTriangle } from 'lucide-react';
import { DefaulterWidget } from '@/components/analytics/DefaulterWidget';
import { AttendanceHeatmap } from '@/components/analytics/AttendanceHeatmap';
import { AttendanceTrend } from '@/components/analytics/AttendanceTrend';

export function AdminDashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) return <PageSpinner />;

  const cards = [
    { label: 'Total Students', value: stats?.total_students ?? 0, icon: Users, color: 'text-blue-600 bg-blue-100' },
    { label: 'Present Today', value: stats?.present_today ?? 0, icon: UserCheck, color: 'text-green-600 bg-green-100' },
    { label: 'Absent Today', value: stats?.absent_today ?? 0, icon: UserX, color: 'text-red-600 bg-red-100' },
    { label: 'Attendance %', value: `${stats?.attendance_percentage ?? 0}%`, icon: TrendingUp, color: 'text-purple-600 bg-purple-100' },
    { label: 'Active Sessions', value: stats?.active_sessions ?? 0, icon: CalendarCheck, color: 'text-orange-600 bg-orange-100' },
    { label: 'Defaulters (<75%)', value: stats?.defaulters_count ?? 0, icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                </div>
                <div className={`p-3 rounded-full ${card.color}`}>
                  <card.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <DefaulterWidget />
        <AttendanceHeatmap />
      </div>

      <AttendanceTrend />
    </div>
  );
}
