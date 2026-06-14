import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Search, Filter } from 'lucide-react';

export function ReportFilters() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input type="date" label="Start Date" />
          <Input type="date" label="End Date" />
          <Select
            label="Student"
            options={[]}
            placeholder="All Students"
          />
        </div>
      </CardContent>
    </Card>
  );
}
