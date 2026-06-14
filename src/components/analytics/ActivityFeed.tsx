import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, AlertTriangle, Send, UserCheck } from 'lucide-react';

interface Activity {
  id: string;
  type: 'marked' | 'correction-submitted' | 'correction-approved' | 'correction-rejected';
  message: string;
  timestamp: string;
  user?: string;
}

interface ActivityFeedProps {
  activities?: Activity[];
  isLoading?: boolean;
}

const activityIcons = {
  'marked': { icon: UserCheck, color: 'text-success', bg: 'bg-green-50' },
  'correction-submitted': { icon: Send, color: 'text-warning', bg: 'bg-amber-50' },
  'correction-approved': { icon: CheckCircle, color: 'text-success', bg: 'bg-green-50' },
  'correction-rejected': { icon: XCircle, color: 'text-danger', bg: 'bg-red-50' },
};

export function RecentActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  const feed = activities || [];
  const today = new Date().toDateString();

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Recent Activity</CardTitle></CardHeader>
        <CardContent><div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-12 w-full" />)}</div></CardContent>
      </Card>
    );
  }

  if (!feed.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Recent Activity</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center py-8 text-sm text-[#9CA3AF]">No recent activity</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {feed.map((activity, i) => {
            const meta = activityIcons[activity.type] || activityIcons['marked'];
            const Icon = meta.icon;
            return (
              <motion.div
                key={activity.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-btn hover:bg-gray-50 transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className={`p-1.5 rounded-btn ${meta.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#111827]">{activity.message}</p>
                  <p className="text-xs text-[#9CA3AF]">{activity.timestamp}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
