import { useAuth } from '@/contexts/AuthContext';
import { useStudentSummary } from '@/hooks/useReports';
import { useMyCorrectionRequests } from '@/hooks/useCorrectionRequests';
import { Card, CardContent } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { TodayStatus } from '@/components/analytics/TodayStatus';
import { CorrectionWidget } from '@/components/analytics/CorrectionWidget';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, MapPin, Send, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { CorrectionRequestModal } from '@/components/attendance/CorrectionRequestModal';

export function StudentDashboard() {
  const { profile } = useAuth();
  const { data: summary, isLoading: summaryLoading } = useStudentSummary(profile?.id);
  const { data: corrections, isLoading: correctionsLoading } = useMyCorrectionRequests(profile?.id);
  const navigate = useNavigate();
  const [showCorrection, setShowCorrection] = useState(false);

  const pct = summary?.percentage ?? 0;
  const pendingCorrections = corrections?.filter((c) => c.status === 'pending')?.length ?? 0;
  const approvedCorrections = corrections?.filter((c) => c.status === 'approved')?.length ?? 0;
  const rejectedCorrections = corrections?.filter((c) => c.status === 'rejected')?.length ?? 0;

  return (
    <div className="page-container">
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="page-title">My Dashboard</h1>
          <p className="page-subtitle">Track your attendance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCorrection(true)}>
            <Send className="w-4 h-4" /> Request Correction
          </Button>
          <Button size="sm" onClick={() => navigate('/attendance')}>
            <MapPin className="w-4 h-4" /> Mark Attendance
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <motion.div
          className="lg:col-span-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="h-full">
            <CardContent className="flex flex-col items-center justify-center py-6 h-full">
              <ProgressRing percentage={pct} size={160} strokeWidth={12}>
                <div className="text-center">
                  <motion.p
                    className="text-3xl font-bold text-[#111827]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {summaryLoading ? '...' : pct}%
                  </motion.p>
                  <p className="text-[10px] text-[#9CA3AF] font-medium uppercase tracking-wider mt-0.5">Overall</p>
                </div>
              </ProgressRing>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1 text-success"><CheckCircle className="w-3.5 h-3.5" /> {summary?.present ?? 0}</span>
                <span className="flex items-center gap-1 text-danger"><XCircle className="w-3.5 h-3.5" /> {summary?.absent ?? 0}</span>
                <span className="flex items-center gap-1 text-[#9CA3AF]"><BookOpen className="w-3.5 h-3.5" /> {summary?.total_classes ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            title="Present Days"
            value={summaryLoading ? '...' : summary?.present ?? 0}
            icon={<CheckCircle className="w-5 h-5" />}
            color="green"
            subtitle={`of ${summary?.total_classes ?? 0} classes`}
            delay={1}
            onClick={() => navigate('/attendance')}
          />
          <KpiCard
            title="Absent Days"
            value={summaryLoading ? '...' : summary?.absent ?? 0}
            icon={<XCircle className="w-5 h-5" />}
            color="red"
            delay={2}
            onClick={() => navigate('/attendance')}
          />
          <KpiCard
            title="Pending Corrections"
            value={correctionsLoading ? '...' : pendingCorrections}
            icon={<Send className="w-5 h-5" />}
            color="amber"
            delay={3}
            onClick={() => setShowCorrection(true)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div><TodayStatus /></div>
        <div className="lg:col-span-2">
          <CorrectionWidget
            pending={pendingCorrections}
            approved={approvedCorrections}
            rejected={rejectedCorrections}
            isLoading={correctionsLoading}
          />
        </div>
      </div>

      {showCorrection && (
        <CorrectionRequestModal isOpen={showCorrection} onClose={() => setShowCorrection(false)} />
      )}
    </div>
  );
}
