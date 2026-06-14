import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { motion } from 'framer-motion';
import { Send, CheckCircle, XCircle, Clock } from 'lucide-react';

interface CorrectionWidgetProps {
  pending?: number;
  approved?: number;
  rejected?: number;
  isLoading?: boolean;
}

export function CorrectionWidget({ pending = 0, approved = 0, rejected = 0, isLoading }: CorrectionWidgetProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Send className="w-4 h-4 text-primary" />Correction Requests</CardTitle></CardHeader>
        <CardContent><div className="h-20 skeleton" /></CardContent>
      </Card>
    );
  }

  const items = [
    { label: 'Pending', value: pending, icon: Clock, color: 'text-warning', bg: 'bg-amber-50', badge: 'warning' as const },
    { label: 'Approved', value: approved, icon: CheckCircle, color: 'text-success', bg: 'bg-green-50', badge: 'success' as const },
    { label: 'Rejected', value: rejected, icon: XCircle, color: 'text-danger', bg: 'bg-red-50', badge: 'danger' as const },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />
          Correction Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                className="flex-1 flex flex-col items-center gap-1.5 p-3 rounded-btn bg-gray-50"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Icon className={`w-5 h-5 ${item.color}`} />
                <span className="text-xl font-bold text-[#111827]">{item.value}</span>
                <Badge variant={item.badge}>{item.label}</Badge>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
