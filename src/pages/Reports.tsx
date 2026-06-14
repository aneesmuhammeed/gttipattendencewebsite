import { useState } from 'react';
import { useReportData, useStudents } from '@/hooks/useReports';
import { usePendingCorrections, useApproveCorrection, useRejectCorrection } from '@/hooks/useCorrectionRequests';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { AttendanceTable } from '@/components/reports/AttendanceTable';
import { AuditLogTable } from '@/components/reports/AuditLogTable';
import { ExportButtons } from '@/components/reports/ExportButtons';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { Card, CardContent } from '@/components/ui/Card';
import { generateReportDateRange } from '@/lib/utils';
import { formatDate, formatTime } from '@/lib/utils';
import type { ReportFilters as RF } from '@/types';
import { CheckCircle, XCircle, ClipboardList, Clock } from 'lucide-react';

type Tab = 'reports' | 'audit' | 'corrections';

export default function Reports() {
  const [tab, setTab] = useState<Tab>('reports');
  const [filters, setFilters] = useState<RF>({});
  const { data: students } = useStudents();
  const { data, isLoading } = useReportData(filters);
  const { data: pendingRequests, isLoading: requestsLoading } = usePendingCorrections();
  const approveMutation = useApproveCorrection();
  const rejectMutation = useRejectCorrection();

  const handlePreset = (range: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    setFilters(generateReportDateRange(range));
  };

  const tableData = (data || []).map((r: any) => ({
    Date: r.attendance_date,
    Student: r.profiles?.full_name ?? '-',
    'Roll No': r.profiles?.roll_number ?? '-',
    Status: r.status,
    Time: new Date(r.marked_at).toLocaleTimeString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('reports')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'reports' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <ClipboardList className="w-4 h-4 inline mr-1" /> Reports
        </button>
        <button
          onClick={() => setTab('audit')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'audit' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <Clock className="w-4 h-4 inline mr-1" /> Audit Trail
        </button>
        <button
          onClick={() => setTab('corrections')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'corrections' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <CheckCircle className="w-4 h-4 inline mr-1" /> Corrections
          {pendingRequests && pendingRequests.length > 0 && (
            <Badge variant="warning" className="ml-1">{pendingRequests.length}</Badge>
          )}
        </button>
      </div>

      {tab === 'reports' && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <ReportFilters
              filters={filters}
              onChange={setFilters}
              onPreset={handlePreset}
              students={students}
            />
            <ExportButtons data={tableData} />
          </div>
          {isLoading ? <PageSpinner /> : <AttendanceTable data={tableData} />}
        </>
      )}

      {tab === 'audit' && <AuditLogTable />}

      {tab === 'corrections' && (
        <Card>
          <CardContent>
            <h3 className="font-semibold text-gray-900 mb-4">Pending Correction Requests</h3>
            {requestsLoading ? (
              <PageSpinner />
            ) : !pendingRequests?.length ? (
              <p className="text-sm text-gray-500 text-center py-4">No pending correction requests.</p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req: any) => (
                  <div key={req.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{req.profiles?.full_name} ({req.profiles?.roll_number})</p>
                        <p className="text-sm text-gray-500">
                          Session: {req.attendance_sessions?.session_code} —{' '}
                          {req.attendance_sessions?.attendance_date && formatDate(req.attendance_sessions.attendance_date)}{' '}
                          {req.attendance_sessions?.start_time && formatTime(req.attendance_sessions.start_time)} -{' '}
                          {req.attendance_sessions?.end_time && formatTime(req.attendance_sessions.end_time)}
                        </p>
                      </div>
                      <Badge variant="warning">Pending</Badge>
                    </div>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                      Reason: {req.reason}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => approveMutation.mutate(req.id)}
                        isLoading={approveMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => rejectMutation.mutate(req.id)}
                        isLoading={rejectMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
