import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useReports';
import { useSessions } from '@/hooks/useSessions';
import { useAttendanceTrend } from '@/hooks/useAnalytics';
import { useCorrectionRequests } from '@/hooks/useCorrectionRequests';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TrendChart } from '@/components/analytics/TrendChart';
import { RecentActivityFeed } from '@/components/analytics/ActivityFeed';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { CreateSessionModal } from '@/components/sessions/CreateSessionModal';
import { SessionCard } from '@/components/sessions/SessionCard';
import { motion } from 'framer-motion';
import {
  UserCheck, UserX, CalendarCheck, AlertTriangle, Plus, Clock, CheckCircle, XCircle,
} from 'lucide-react';
import { useAttendanceRecords } from '@/hooks/useAttendance';

export function ProfessorDashboard() {
  const { profile } = useAuth();
  const { data: stats } = useDashboardStats();
  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const { data: trend, isLoading: trendLoading } = useAttendanceTrend(undefined, 30);
  const { data: correctionRequests, isLoading: correctionsLoading } = useCorrectionRequests(profile?.id);
  const { data: records } = useAttendanceRecords();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const activeSessions = sessions?.filter((s) => s.is_active) || [];
  const pendingCorrections = correctionRequests?.filter((c) => c.status === 'pending') || [];

  const activities = (records || []).slice(0, 10).map((r: any) => ({
    id: r.id,
    type: 'marked' as const,
    message: `${r.profiles?.full_name || 'Student'} marked attendance`,
    timestamp: new Date(r.marked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  }));

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
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" /> Create Session
        </Button>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Present Today" value={stats?.present_today ?? 0} icon={<UserCheck className="w-5 h-5" />} color="green" delay={0} />
        <KpiCard title="Absent Today" value={stats?.absent_today ?? 0} icon={<UserX className="w-5 h-5" />} color="red" delay={1} />
        <KpiCard title="Active Sessions" value={activeSessions.length} icon={<CalendarCheck className="w-5 h-5" />} color="blue" delay={2} />
        <KpiCard title="Pending Corrections" value={pendingCorrections.length} icon={<AlertTriangle className="w-5 h-5" />} color="amber" delay={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <TrendChart data={trend} isLoading={trendLoading} title="Attendance Trend (30 Days)" days={30} />
        </div>
        <RecentActivityFeed activities={activities} />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Sessions ({activeSessions.length})</TabsTrigger>
          <TabsTrigger value="history">Session History</TabsTrigger>
          <TabsTrigger value="corrections">Corrections ({pendingCorrections.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {sessionsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="skeleton h-32 rounded-card" />)}
            </div>
          ) : activeSessions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CalendarCheck className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
                <p className="text-base font-medium text-[#111827] mb-1">No Active Sessions</p>
                <p className="text-sm text-[#6B7280] mb-4">Create a new session to start taking attendance</p>
                <Button onClick={() => setShowCreateModal(true)}><Plus className="w-4 h-4" /> Create Session</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(sessions || []).filter(s => !s.is_active).map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="corrections">
          {correctionsLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-card" />)}</div>
          ) : pendingCorrections.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
                <p className="text-sm text-[#6B7280]">No pending correction requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingCorrections.map((cr: any) => (
                <Card key={cr.id} hover={false}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[#111827]">{cr.profiles?.full_name}</span>
                        <Badge variant="warning">Pending</Badge>
                      </div>
                      <p className="text-sm text-[#6B7280] mb-1">{cr.reason}</p>
                      <p className="text-xs text-[#9CA3AF]">
                        {cr.date && new Date(cr.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline"><XCircle className="w-4 h-4" /> Reject</Button>
                      <Button size="sm"><CheckCircle className="w-4 h-4" /> Approve</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {showCreateModal && <CreateSessionModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
