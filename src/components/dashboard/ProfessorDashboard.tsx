import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useReports';
import { useUpcomingSchedule } from '@/hooks/useSchedule';
import { useAttendanceTrend } from '@/hooks/useAnalytics';
import { useCorrectionRequests } from '@/hooks/useCorrectionRequests';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TrendChart } from '@/components/analytics/TrendChart';
import { RecentActivityFeed } from '@/components/analytics/ActivityFeed';
import { motion } from 'framer-motion';
import {
  UserCheck, UserX, CalendarCheck, AlertTriangle, Plus,
} from 'lucide-react';

export function ProfessorDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: stats, refetch: refetchStats } = useDashboardStats();
  const { data: upcoming } = useUpcomingSchedule();
  const { data: trend, isLoading: trendLoading } = useAttendanceTrend(undefined, 30);
  const { data: correctionRequests, isLoading: correctionsLoading } = useCorrectionRequests();

  const { data: recentRecords } = useQuery({
    queryKey: ['professor-recent-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance_records')
        .select('id, status, marked_at, attendance_date, profiles!attendance_records_student_id_fkey(full_name, roll_number)')
        .order('marked_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: 15000,
  });

  const pendingCorrections = correctionRequests?.filter((c) => c.status === 'pending') || [];
  const upcomingClasses = upcoming?.length || 0;

  const activities = [
    ...(recentRecords || []).map((r: any) => ({
      id: r.id,
      type: r.status === 'present' ? 'marked' : 'absent',
      message: r.status === 'present'
        ? `${r.profiles?.full_name || 'Student'} marked present`
        : `${r.profiles?.full_name || 'Student'} was marked absent`,
      timestamp: new Date(r.marked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    })),
    ...(correctionRequests || []).slice(0, 4).map((c: any) => ({
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
          <h1 className="page-title">Professor Analytics</h1>
          <p className="page-subtitle">Monitor class attendance in real-time</p>
        </div>
        <Button size="sm" onClick={() => navigate('/sessions')}>
          <Plus className="w-4 h-4" /> Manage Schedule
        </Button>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Present Today" value={stats?.present_today ?? 0} icon={<UserCheck className="w-5 h-5" />} color="green" delay={0} onClick={() => navigate('/reports')} />
        <KpiCard title="Absent Today" value={stats?.absent_today ?? 0} icon={<UserX className="w-5 h-5" />} color="red" delay={1} onClick={() => navigate('/reports')} />
        <KpiCard title="Upcoming Classes" value={upcomingClasses} icon={<CalendarCheck className="w-5 h-5" />} color="blue" delay={2} onClick={() => navigate('/sessions')} />
        <KpiCard title="Pending Corrections" value={pendingCorrections.length} icon={<AlertTriangle className="w-5 h-5" />} color="amber" delay={3} onClick={() => navigate('/reports')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <TrendChart data={trend} isLoading={trendLoading} title="Attendance Trend (30 Days)" days={30} />
        </div>
        <RecentActivityFeed activities={activities} />
      </div>
    </div>
  );
}
