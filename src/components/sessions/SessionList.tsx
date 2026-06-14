import { useSessions, useToggleSession } from '@/hooks/useSessions';
import { SessionCard } from './SessionCard';
import { PageSpinner } from '@/components/ui/Spinner';
import { AlertCircle } from 'lucide-react';

export function SessionList() {
  const { data: sessions, isLoading, error } = useSessions();
  const toggleSession = useToggleSession();

  if (isLoading) return <PageSpinner />;
  if (error) return (
    <div className="flex items-center gap-2 text-red-600 p-4">
      <AlertCircle className="w-5 h-5" />
      <span>Failed to load sessions</span>
    </div>
  );

  if (!sessions?.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium">No sessions yet</p>
        <p className="text-sm mt-1">Create your first attendance session to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          onToggle={(id, isActive) => toggleSession.mutate({ id, is_active: isActive })}
        />
      ))}
    </div>
  );
}
