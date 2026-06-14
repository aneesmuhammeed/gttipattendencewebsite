import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input, SearchInput } from '@/components/ui/Input';
import { useState } from 'react';
import { Globe, Monitor, Smartphone, Chrome, Fingerprint, MapPin, Clock, Shield } from 'lucide-react';

export function AuditLogTable() {
  const { data: logs, isLoading } = useAuditLogs();
  const [search, setSearch] = useState('');

  const filtered = (logs || []).filter((log: any) =>
    !search ||
    log.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    log.profiles?.roll_number?.toLowerCase().includes(search.toLowerCase()) ||
    log.attendance_sessions?.session_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card hover={false}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Audit Trail
          </CardTitle>
          <SearchInput
            placeholder="Search audit logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-60"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-[#9CA3AF]">No audit logs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Student</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Session</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Device</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Browser</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">IP Address</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Location</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log: any) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3">
                      <div>
                        <p className="font-medium text-[#111827] text-xs">{log.profiles?.full_name}</p>
                        <p className="text-[10px] text-[#9CA3AF]">{log.profiles?.roll_number}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs font-mono text-[#6B7280]">{log.attendance_sessions?.session_code || '-'}</td>
                    <td className="py-3 px-3">
                      <span className="flex items-center gap-1 text-xs text-[#6B7280]">
                        {log.device_info?.toLowerCase().includes('mobile') || log.device_info?.toLowerCase().includes('android') || log.device_info?.toLowerCase().includes('iphone')
                          ? <Smartphone className="w-3 h-3" />
                          : <Monitor className="w-3 h-3" />
                        }
                        {log.device_info || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="flex items-center gap-1 text-xs text-[#6B7280]">
                        <Chrome className="w-3 h-3" />
                        {log.browser || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-[#6B7280]">{log.ip_address || '-'}</td>
                    <td className="py-3 px-3">
                      {log.latitude && log.longitude ? (
                        <span className="flex items-center gap-1 text-xs text-[#6B7280]">
                          <MapPin className="w-3 h-3" />
                          {log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-xs text-[#9CA3AF]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="flex items-center gap-1 text-xs text-[#6B7280] justify-end">
                        <Clock className="w-3 h-3" />
                        {new Date(log.marked_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
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
