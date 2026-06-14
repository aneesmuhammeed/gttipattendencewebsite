import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateCorrectionRequest } from '@/hooks/useCorrectionRequests';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preselectedDate?: string | null;
}

export function CorrectionRequestModal({ isOpen, onClose, preselectedDate }: Props) {
  const createRequest = useCreateCorrectionRequest();
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preselectedDate || !reason.trim()) return;
    await createRequest.mutateAsync({ date: preselectedDate, reason });
    setReason('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Attendance Correction / Leave">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg text-sm">
          <span className="text-gray-500">Date: </span>
          <span className="font-medium text-gray-900">
            {preselectedDate ? new Date(preselectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '-'}
          </span>
        </div>
        <Input
          label="Reason"
          placeholder="e.g., I was present but couldn't mark attendance / Medical leave"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={createRequest.isPending} disabled={!reason.trim()}>
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
