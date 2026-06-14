import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CreateSessionModal } from '@/components/sessions/CreateSessionModal';
import { SessionList } from '@/components/sessions/SessionList';
import { Plus } from 'lucide-react';

export default function Sessions() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Create Session
        </Button>
      </div>
      <SessionList />
      <CreateSessionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
