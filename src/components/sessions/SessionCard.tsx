import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Copy, Check, Power, ExternalLink, Clock } from 'lucide-react';
import { getAttendanceLink, copyToClipboard, formatTime, formatDate } from '@/lib/utils';
import type { AttendanceSession } from '@/types';
import { useState, useEffect } from 'react';
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
    <Card className="relative overflow-hidden">
      {session.is_active && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-success animate-pulse" />
      )}
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-[#111827]">
              Session: <code className="font-mono text-primary">{session.session_code}</code>
            </p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">{formatDate(session.attendance_date)}</p>
          </div>
          <Badge variant={session.is_active ? 'success' : 'default'}>
            {session.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#6B7280]">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(session.start_time)} — {formatTime(session.end_time)}
          </span>
          {session.profiles && (
            <span>by {session.profiles.full_name}</span>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-btn bg-gray-50 border border-gray-100">
          <code className="flex-1 text-xs text-[#6B7280] truncate">{link}</code>
          <button
            onClick={handleCopy}
            className="p-1 rounded text-[#9CA3AF] hover:text-primary hover:bg-white transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="w-4 h-4" /> Copy Link
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.open(link, '_blank')}>
            <ExternalLink className="w-4 h-4" /> Open
          </Button>
          {onToggle && (
            <Button
              size="sm"
              variant={session.is_active ? 'danger' : 'primary'}
              onClick={() => onToggle(session.id, !session.is_active)}
              className="ml-auto"
            >
              <Power className="w-4 h-4" />
              {session.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
