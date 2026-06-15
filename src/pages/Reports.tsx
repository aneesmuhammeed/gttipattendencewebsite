import { useState } from 'react';
import { useReportData, useStudents } from '@/hooks/useReports';
import { usePendingCorrections, useApproveCorrection, useRejectCorrection } from '@/hooks/useCorrectionRequests';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, SearchInput } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { generateReportDateRange } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  Download,
  FileSpreadsheet,
  FileText,
  ArrowUpDown,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { exportToExcel, exportToCSV, exportToPDF } from '@/components/reports/ExportButtons';

export default function Reports() {
  const { profile } = useAuth();
  const [dateRange, setDateRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('attendance_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: pendingRequests, isLoading: pendingLoading } = usePendingCorrections();
  const approveCorrection = useApproveCorrection();
  const rejectCorrection = useRejectCorrection();

  const dateParams = dateRange === 'custom'
    ? { start_date: customStart, end_date: customEnd }
    : generateReportDateRange(dateRange);

  const { data: records, isLoading } = useReportData({
    start_date: dateParams.start_date,
    end_date: dateParams.end_date,
    student_id: studentFilter || undefined,
  });

  const { data: students } = useStudents();

  const filtered = (records || [])
    .filter((r: any) =>
      !searchQuery ||
      r.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.profiles?.roll_number?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a: any, b: any) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const rangeOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const SortIcon = ({ field }: { field: string }) => (
    <ArrowUpDown className="w-3 h-3 text-[#9CA3AF] ml-1" />
  );

  const isProfessorOrAdmin = profile?.role === 'professor' || profile?.role === 'admin';

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Analyze attendance data and generate reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToPDF(filtered, dateParams)}>
            <FileText className="w-4 h-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToExcel(filtered, dateParams)}>
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered, dateParams)}>
            <Download className="w-4 h-4" /> CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="reports">
        <TabsList className="mb-6">
          <TabsTrigger value="reports">
            Attendance Records
          </TabsTrigger>
          {isProfessorOrAdmin && (
            <TabsTrigger value="corrections">
              Correction Requests
              {pendingRequests && pendingRequests.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-danger text-white">{pendingRequests.length}</span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="reports">
          <Card className="mb-6">
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {rangeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDateRange(opt.value as any)}
                      className={`tab-btn ${dateRange === opt.value ? 'active' : ''}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {dateRange === 'custom' && (
                  <div className="flex items-center gap-2">
                    <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-36" />
                    <span className="text-[#9CA3AF]">to</span>
                    <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-36" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <SearchInput
                    placeholder="Search by name or roll number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select
                  options={(students || []).map((s: any) => ({ value: s.id, label: `${s.full_name} (${s.roll_number || 'N/A'})` }))}
                  placeholder="All Students"
                  value={studentFilter}
                  onChange={(e) => setStudentFilter(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card hover={false}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Attendance Records
                  {filtered.length > 0 && (
                    <span className="text-sm font-normal text-[#6B7280] ml-2">({filtered.length} records)</span>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="skeleton h-10 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
                  <p className="text-sm text-[#6B7280]">No records found for the selected period</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#111827]" onClick={() => toggleSort('profiles.full_name')}>
                          Student <SortIcon field="profiles.full_name" />
                        </th>
                        <th className="text-left py-3 px-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#111827]" onClick={() => toggleSort('attendance_date')}>
                          Date <SortIcon field="attendance_date" />
                        </th>
                        <th className="text-left py-3 px-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#111827]" onClick={() => toggleSort('status')}>
                          Status <SortIcon field="status" />
                        </th>
                        <th className="text-right py-3 px-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#111827]" onClick={() => toggleSort('marked_at')}>
                          Time <SortIcon field="marked_at" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((record: any) => (
                        <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-3">
                            <div>
                              <p className="font-medium text-[#111827]">{record.profiles?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-[#9CA3AF]">{record.profiles?.roll_number || ''}</p>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[#111827]">
                            {new Date(record.attendance_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={record.status === 'present' ? 'success' : 'danger'}>
                              {record.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right text-[#6B7280] text-xs">
                            {record.marked_at ? new Date(record.marked_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="corrections">
          {pendingLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 w-full" />)}
            </div>
          ) : !pendingRequests || pendingRequests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
              <p className="text-sm text-[#6B7280]">No pending correction requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <Card key={req.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-[#111827]">{(req as any).profiles?.full_name || 'Unknown'}</p>
                          <span className="text-xs text-[#9CA3AF]">{(req as any).profiles?.roll_number || ''}</span>
                        </div>
                        <p className="text-xs text-[#6B7280] mb-1">
                          {req.date && new Date(req.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-sm text-[#111827] bg-gray-50 rounded-btn px-3 py-2">{req.reason}</p>
                        <p className="text-[10px] text-[#9CA3AF] mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => approveCorrection.mutate(req.id)}
                          isLoading={approveCorrection.isPending}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectCorrection.mutate(req.id)}
                          isLoading={rejectCorrection.isPending}
                          className="text-danger border-danger/30 hover:bg-danger/5"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
