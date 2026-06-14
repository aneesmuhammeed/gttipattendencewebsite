import { useDefaulters } from '@/hooks/useReports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle } from 'lucide-react';

export function DefaulterWidget() {
  const { data: defaulters, isLoading } = useDefaulters();

  return (
    <Card className={defaulters && defaulters.length > 0 ? 'border-red-200' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          Students Below 75% Attendance
          {defaulters && defaulters.length > 0 && (
            <Badge variant="danger">{defaulters.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : !defaulters?.length ? (
          <p className="text-sm text-green-600">All students have satisfactory attendance.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {defaulters.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{d.profiles?.full_name}</p>
                  <p className="text-xs text-gray-500">{d.profiles?.roll_number} — {d.profiles?.email}</p>
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
