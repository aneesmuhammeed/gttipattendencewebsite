import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { ClipboardList } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export function AuditLogTable() {
  const { data: logs, isLoading } = useAuditLogs();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary-600" />
          Attendance Audit Trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PageSpinner />
        ) : !logs?.length ? (
          <p className="text-sm text-gray-500 text-center py-4">No audit logs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Time</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Student</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Session</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Device</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Browser</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">IP</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">GPS</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                      {formatDateTime(log.marked_at)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{log.profiles?.full_name || '-'}</span>
                      <span className="text-gray-400 ml-1">{log.profiles?.roll_number || ''}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {log.attendance_sessions?.session_code || '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Badge variant="default">{log.device_info || '-'}</Badge>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {log.browser || '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600 font-mono text-xs">
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600 text-xs">
                      {log.latitude ? `${log.latitude.toFixed(4)}, ${log.longitude?.toFixed(4)}` : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Badge variant={log.action_type === 'mark' ? 'success' : 'warning'}>
                        {log.action_type}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
