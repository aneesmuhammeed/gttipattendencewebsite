import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Copy, Check, Power, ExternalLink } from 'lucide-react';
import { getAttendanceLink, copyToClipboard, formatTime, formatDate } from '@/lib/utils';
import type { AttendanceSession } from '@/types';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface SessionCardProps {
  session: AttendanceSession & { profiles?: { full_name: string } };
  onToggle?: (id: string, isActive: boolean) => void;
}

export function SessionCard({ session, onToggle }: SessionCardProps) {
  const [copied, setCopied] = useState(false);
  const link = getAttendanceLink(session.session_code);

  const handleCopy = async () => {
    await copyToClipboard(link);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">Session Code: <code className="text-gray-900 font-medium">{session.session_code}</code></p>
          </div>
          <Badge variant={session.is_active ? 'success' : 'danger'}>
            {session.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span>Date: {formatDate(session.attendance_date)}</span>
          <span>Time: {formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
          {session.profiles && <span>By: {session.profiles.full_name}</span>}
        </div>

        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
          <code className="flex-1 text-xs text-gray-600 truncate">{link}</code>
          <Button size="sm" variant="ghost" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-1" /> Copy Link
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.open(link, '_blank')}>
            <ExternalLink className="w-4 h-4 mr-1" /> Open
          </Button>
          {onToggle && (
            <Button
              size="sm"
              variant={session.is_active ? 'danger' : 'secondary'}
              onClick={() => onToggle(session.id, !session.is_active)}
              className="ml-auto"
            >
              <Power className="w-4 h-4 mr-1" />
              {session.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
