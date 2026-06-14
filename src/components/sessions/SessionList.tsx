import { useSessions, useToggleSession } from '@/hooks/useSessions';
import { SessionCard } from '@/components/sessions/SessionCard';
import { Card, CardContent } from '@/components/ui/Card';
import { CalendarCheck, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SessionListProps {
  onShowCreate: () => void;
}

export function SessionList({ onShowCreate }: SessionListProps) {
  const { data: sessions, isLoading } = useSessions();
  const toggleSession = useToggleSession();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-card p-5 shadow-card space-y-3">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-8 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!sessions?.length) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <CalendarCheck className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
          <p className="text-base font-medium text-[#111827] mb-1">No Sessions</p>
          <p className="text-sm text-[#6B7280] mb-4">Create your first attendance session</p>
          <Button onClick={onShowCreate}>
            <Plus className="w-4 h-4" /> Create Session
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          onToggle={(id, is_active) => toggleSession.mutate({ id, is_active })}
        />
      ))}
    </div>
  );
}
