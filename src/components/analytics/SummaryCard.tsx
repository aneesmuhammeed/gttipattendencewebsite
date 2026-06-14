import { useAuth } from '@/contexts/AuthContext';
import { useMyCorrectionRequests } from '@/hooks/useCorrectionRequests';
import { useStudentSummary } from '@/hooks/useReports';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle, XCircle, Send } from 'lucide-react';

interface SummaryCardProps {
  isLoading?: boolean;
}

export function SummaryCard({ isLoading }: SummaryCardProps) {
  const { profile } = useAuth();
  const { data: summary, isLoading: summaryLoading } = useStudentSummary(profile?.id);
  const { data: corrections, isLoading: correctionsLoading } = useMyCorrectionRequests(profile?.id);

  const loading = isLoading || summaryLoading || correctionsLoading;

  const items = [
    { label: 'Total Sessions', value: summary?.total_classes ?? 0, icon: BookOpen, color: 'text-primary' },
    { label: 'Present Days', value: summary?.present ?? 0, icon: CheckCircle, color: 'text-success' },
    { label: 'Absent Days', value: summary?.absent ?? 0, icon: XCircle, color: 'text-danger' },
    { label: 'Corrections', value: corrections?.length ?? 0, icon: Send, color: 'text-warning' },
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Attendance Summary</CardTitle></CardHeader>
        <CardContent><div className="h-24 skeleton" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                className="flex items-center gap-3 p-3 rounded-btn bg-gray-50"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Icon className={`w-5 h-5 ${item.color}`} />
                <div>
                  <p className="text-lg font-bold text-[#111827]">{item.value}</p>
                  <p className="text-xs text-[#6B7280]">{item.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
