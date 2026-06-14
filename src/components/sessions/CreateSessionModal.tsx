import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateSession } from '@/hooks/useSessions';

const sessionSchema = z.object({
  attendance_date: z.string().min(1, 'Date required'),
  start_time: z.string().min(1, 'Start time required'),
  end_time: z.string().min(1, 'End time required'),
}).refine((data) => data.start_time < data.end_time, {
  message: 'End time must be after start time',
  path: ['end_time'],
});

type SessionFormData = z.infer<typeof sessionSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateSessionModal({ isOpen, onClose }: Props) {
  const createSession = useCreateSession();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      attendance_date: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: SessionFormData) => {
    await createSession.mutateAsync(data);
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Attendance Session">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input id="attendance_date" label="Date" type="date" error={errors.attendance_date?.message} {...register('attendance_date')} />
        <div className="grid grid-cols-2 gap-4">
          <Input id="start_time" label="Start Time" type="time" error={errors.start_time?.message} {...register('start_time')} />
          <Input id="end_time" label="End Time" type="time" error={errors.end_time?.message} {...register('end_time')} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Create Session</Button>
        </div>
      </form>
    </Modal>
  );
}
