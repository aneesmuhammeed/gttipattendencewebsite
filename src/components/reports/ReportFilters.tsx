import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { ReportFilters as RF } from '@/types';

interface Props {
  filters: RF;
  onChange: (filters: RF) => void;
  onPreset: (range: 'daily' | 'weekly' | 'monthly' | 'yearly') => void;
  students?: { id: string; full_name: string; roll_number: string }[];
}

export function ReportFilters({ filters, onChange, onPreset, students }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onPreset('daily')}>Daily</Button>
        <Button size="sm" variant="outline" onClick={() => onPreset('weekly')}>Weekly</Button>
        <Button size="sm" variant="outline" onClick={() => onPreset('monthly')}>Monthly</Button>
        <Button size="sm" variant="outline" onClick={() => onPreset('yearly')}>Yearly</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {students && (
          <Select
            placeholder="All Students"
            options={students.map((s) => ({ value: s.id, label: `${s.full_name} (${s.roll_number || ''})` }))}
            value={filters.student_id ?? ''}
            onChange={(e) => onChange({ ...filters, student_id: e.target.value || undefined })}
          />
        )}
        <Input
          type="date"
          value={filters.start_date ?? ''}
          onChange={(e) => onChange({ ...filters, start_date: e.target.value || undefined })}
          placeholder="Start Date"
        />
        <Input
          type="date"
          value={filters.end_date ?? ''}
          onChange={(e) => onChange({ ...filters, end_date: e.target.value || undefined })}
          placeholder="End Date"
        />
      </div>
    </div>
  );
}
