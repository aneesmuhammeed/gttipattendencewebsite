import { useState, useEffect, useRef } from 'react';
import { useAutoExpireSessions } from '@/hooks/useSessions';
import { CreateSessionModal } from '@/components/sessions/CreateSessionModal';
import { SessionList } from '@/components/sessions/SessionList';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useQueryClient } from '@tanstack/react-query';

export default function Sessions() {
  const [showCreate, setShowCreate] = useState(false);
  const autoExpire = useAutoExpireSessions();
  const queryClient = useQueryClient();
  const expiredRef = useRef(false);

  useEffect(() => {
    if (expiredRef.current) return;
    expiredRef.current = true;

    autoExpire.mutate(undefined, {
      onSuccess: (count) => {
        if (count > 0) {
          queryClient.invalidateQueries({ queryKey: ['sessions'] });
        }
      },
    });
  }, []);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Sessions</h1>
          <p className="page-subtitle">Manage attendance sessions — expired sessions auto-mark absent students</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Session
        </Button>
      </div>

      <SessionList onShowCreate={() => setShowCreate(true)} />

      {showCreate && <CreateSessionModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
