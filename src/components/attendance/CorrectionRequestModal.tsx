import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateCorrectionRequest } from '@/hooks/useCorrectionRequests';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preselectedDate?: string | null;
}

export function CorrectionRequestModal({ isOpen, onClose, preselectedDate }: Props) {
  const createRequest = useCreateCorrectionRequest();
  const [reason, setReason] = useState('');
  const [customDate, setCustomDate] = useState(preselectedDate || new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDate || !reason.trim()) {
      toast.error('Please provide a date and reason');
      return;
    }
    await createRequest.mutateAsync({ date: customDate, reason });
    setReason('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Attendance Correction">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-btn bg-gray-50 text-sm">
          <span className="text-[#6B7280]">Date: </span>
          <span className="font-medium text-[#111827]">
            {preselectedDate
              ? new Date(preselectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
              : '—'}
          </span>
        </div>
        {!preselectedDate && (
          <Input
            label="Date"
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
          />
        )}
        <Input
          label="Reason"
          placeholder="e.g., I was present but couldn't mark attendance / Medical leave"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={createRequest.isPending} disabled={!reason.trim()}>
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
