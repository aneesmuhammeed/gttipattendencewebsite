import { useDefaulters } from '@/hooks/useReports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle } from 'lucide-react';

export function DefaulterWidget() {
  const { data: defaulters, isLoading } = useDefaulters();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-danger" />
          Students Below 75%
          {defaulters && defaulters.length > 0 && (
            <Badge variant="danger">{defaulters.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-[#9CA3AF] text-center py-4">Loading...</p>
        ) : !defaulters?.length ? (
          <p className="text-sm text-success text-center py-4">All students have satisfactory attendance.</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {defaulters.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-btn hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-[#111827]">{d.profiles?.full_name}</p>
                  <p className="text-xs text-[#9CA3AF]">{d.profiles?.roll_number}</p>
                </div>
                <Badge variant="danger">{d.percentage}%</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
