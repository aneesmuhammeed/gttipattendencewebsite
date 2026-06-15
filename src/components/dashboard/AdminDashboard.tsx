import { useDashboardStats } from '@/hooks/useReports';
import { useAttendanceTrend } from '@/hooks/useAnalytics';
import { useAttendanceHeatmap } from '@/hooks/useAnalytics';
import { useDefaulters } from '@/hooks/useReports';
import { useCorrectionRequests } from '@/hooks/useCorrectionRequests';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ContributionHeatmap } from '@/components/analytics/ContributionHeatmap';
import { TrendChart } from '@/components/analytics/TrendChart';
import { HealthGauge } from '@/components/analytics/HealthGauge';
import { RecentActivityFeed } from '@/components/analytics/ActivityFeed';
import { motion } from 'framer-motion';
import {
  Users, UserCheck, UserX, CalendarCheck, Activity, AlertTriangle, Plus, Download, BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuditLogTable } from '@/components/reports/AuditLogTable';

export function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: trend, isLoading: trendLoading } = useAttendanceTrend(undefined, 90);
  const { data: heatmap, isLoading: heatmapLoading } = useAttendanceHeatmap();
  const { data: defaulters, isLoading: defaultersLoading } = useDefaulters();
  const { data: corrections } = useCorrectionRequests();
  const navigate = useNavigate();

  const { data: recentRecords } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance_records')
        .select('id, marked_at, profiles!attendance_records_student_id_fkey(full_name)')
        .order('marked_at', { ascending: false })
        .limit(8);
      return data || [];
    },
    refetchInterval: 30000,
  });

  const activities = [
    ...(recentRecords || []).map((r: any) => ({
      id: r.id,
      type: 'marked' as const,
      message: `${r.profiles?.full_name || 'Student'} marked attendance`,
      timestamp: new Date(r.marked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    })),
    ...(corrections || []).slice(0, 4).map((c: any) => ({
      id: c.id,
      type: (c.status === 'approved' ? 'correction-approved' : c.status === 'rejected' ? 'correction-rejected' : 'correction-submitted') as any,
      message: `Correction ${c.status} — ${c.profiles?.full_name || 'Student'}`,
      timestamp: new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

  return (
    <div className="page-container">
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="page-title">Admin Analytics</h1>
          <p className="page-subtitle">Complete institution attendance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
            <Download className="w-4 h-4" /> Export Report
          </Button>
          <Button size="sm" onClick={() => navigate('/sessions')}>
            <Plus className="w-4 h-4" /> Schedule
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <KpiCard title="Total Students" value={statsLoading ? '...' : stats?.total_students ?? 0} icon={<Users className="w-5 h-5" />} color="blue" delay={0} onClick={() => navigate('/users')} />
        <KpiCard title="Present Today" value={statsLoading ? '...' : stats?.present_today ?? 0} icon={<UserCheck className="w-5 h-5" />} color="green" subtitle={`${stats?.attendance_percentage ?? 0}% rate`} trend={{ value: 5, isUp: true }} delay={1} onClick={() => navigate('/reports')} />
        <KpiCard title="Absent Today" value={statsLoading ? '...' : stats?.absent_today ?? 0} icon={<UserX className="w-5 h-5" />} color="red" delay={2} onClick={() => navigate('/reports')} />
        <KpiCard title="Attendance %" value={statsLoading ? '...' : `${stats?.attendance_percentage ?? 0}%`} icon={<Activity className="w-5 h-5" />} color="purple" delay={3} onClick={() => navigate('/reports')} />
        <KpiCard title="Scheduled Today" value={statsLoading ? '...' : stats?.scheduled_today ?? 0} icon={<CalendarCheck className="w-5 h-5" />} color="amber" delay={4} onClick={() => navigate('/sessions')} />
        <KpiCard title="Defaulters <75%" value={statsLoading ? '...' : stats?.defaulters_count ?? 0} icon={<AlertTriangle className="w-5 h-5" />} color="red" delay={5} onClick={() => navigate('/reports')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <TrendChart data={trend} isLoading={trendLoading} title="Attendance Trend (90 Days)" days={90} />
        </div>
        <RecentActivityFeed activities={activities} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ContributionHeatmap data={heatmap?.map(m => ({ date: m.month + '-01', percentage: m.percentage, present: m.present, total: m.total }))} isLoading={heatmapLoading} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-danger" />
              Defaulters — Below 75%
              {defaulters && defaulters.length > 0 && (
                <Badge variant="danger">{defaulters.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {defaultersLoading ? (
              <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-10 w-full" />)}</div>
            ) : !defaulters?.length ? (
              <div className="py-8 text-center text-sm text-success">All students have satisfactory attendance.</div>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {defaulters.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-btn hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-[#111827]">{d.profiles?.full_name}</p>
                      <p className="text-xs text-[#9CA3AF]">{d.profiles?.roll_number}</p>
                    </div>
                    <Badge variant="danger">{d.percentage}%</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <AuditLogTable />
      </div>
    </div>
  );
}
