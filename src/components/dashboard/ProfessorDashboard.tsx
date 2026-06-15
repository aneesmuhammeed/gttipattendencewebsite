import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useReports';
import { useUpcomingSchedule } from '@/hooks/useSchedule';
import { useAttendanceTrend } from '@/hooks/useAnalytics';
import { useCorrectionRequests } from '@/hooks/useCorrectionRequests';
import { Card, CardContent } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Button } from '@/components/ui/Button';
import { TrendChart } from '@/components/analytics/TrendChart';
import { RecentActivityFeed } from '@/components/analytics/ActivityFeed';
import { motion } from 'framer-motion';
import {
  UserCheck, UserX, CalendarCheck, AlertTriangle, Plus,
} from 'lucide-react';

export function ProfessorDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: stats } = useDashboardStats();
  const { data: upcoming } = useUpcomingSchedule();
  const { data: trend, isLoading: trendLoading } = useAttendanceTrend(undefined, 30);
  const { data: correctionRequests, isLoading: correctionsLoading } = useCorrectionRequests();

  const pendingCorrections = correctionRequests?.filter((c) => c.status === 'pending') || [];
  const upcomingClasses = upcoming?.length || 0;

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
        <RecentActivityFeed activities={[]} />
      </div>
    </div>
  );
}
