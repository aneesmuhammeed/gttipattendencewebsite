import { useAuth } from '@/contexts/AuthContext';
import { useTodayAttendance } from '@/hooks/useAttendance';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, AlertTriangle, Send } from 'lucide-react';

export function TodayStatus() {
  const { profile } = useAuth();
  const { data: todayRecord, isLoading } = useTodayAttendance(profile?.id);

  const { data: endedToday } = useQuery({
    queryKey: ['today-schedule-ended'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const { data } = await supabase
        .from('attendance_schedule')
        .select('id, end_time')
        .eq('date', today)
        .lte('end_time', currentTime);
      return (data || []).length > 0;
    },
  });

  const getStatus = () => {
    if (isLoading) return { label: 'Checking...', icon: Clock, color: 'text-[#6B7280]', bg: 'bg-gray-50', badge: 'default' as const };
    if (todayRecord) {
      if (todayRecord.status === 'present') return { label: 'Present', icon: CheckCircle, color: 'text-success', bg: 'bg-green-50', badge: 'success' as const };
      return { label: 'Absent', icon: XCircle, color: 'text-danger', bg: 'bg-red-50', badge: 'danger' as const };
    }
    if (endedToday) return { label: 'Absent', icon: XCircle, color: 'text-danger', bg: 'bg-red-50', badge: 'danger' as const };
    return { label: 'Not Marked Yet', icon: Clock, color: 'text-warning', bg: 'bg-amber-50', badge: 'warning' as const };
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Status</CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div
          className={`flex items-center gap-4 p-4 rounded-btn ${status.bg}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Icon className={`w-10 h-10 ${status.color}`} />
          <div>
            <Badge variant={status.badge}>{status.label}</Badge>
            <p className="text-sm text-[#6B7280] mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
