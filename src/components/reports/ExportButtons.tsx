import { Button } from '@/components/ui/Button';
import { FileText, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';

function getExportData(records: any[]): Record<string, any>[] {
  return records.map((r) => ({
    'Student Name': r.profiles?.full_name || 'Unknown',
    'Date': r.attendance_date,
    'Status': r.status === 'present' ? 'Present' : 'Absent',
  }));
}

export function exportToCSV(data: any[], _filters?: any) {
  if (!data.length) { toast.error('No data to export'); return; }
  const rows = getExportData(data);
  const headers = Object.keys(rows[0]);
  const csvRows = [headers.join(',')];
  for (const row of rows) {
    csvRows.push(headers.map((h) => `"${String(row[h] ?? '')}"`).join(','));
  }
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'attendance-report.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV exported');
}

export function exportToExcel(data: any[], _filters?: any) {
  if (!data.length) { toast.error('No data to export'); return; }
  const ws = XLSX.utils.json_to_sheet(getExportData(data));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  XLSX.writeFile(wb, 'attendance-report.xlsx');
  toast.success('Excel exported');
}

export function exportToPDF(data: any[], _filters?: any) {
  if (!data.length) { toast.error('No data to export'); return; }
  const rows = getExportData(data);
  const headers = Object.keys(rows[0]);
  const body = rows.map((row) => headers.map((h) => String(row[h] ?? '')));
  const doc = new jsPDF();
  doc.text('Attendance Report', 14, 15);
  (doc as any).autoTable({
    head: [headers],
    body,
    startY: 25,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [22, 87, 197] },
  });
  doc.save('attendance-report.pdf');
  toast.success('PDF exported');
}

interface ExportButtonsProps {
  data: Record<string, unknown>[];
  filename?: string;
}

export function ExportButtons({ data, filename = 'attendance-report' }: ExportButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => exportToCSV(data)}>
        <Download className="w-4 h-4" /> CSV
      </Button>
      <Button size="sm" variant="outline" onClick={() => exportToExcel(data)}>
        <FileSpreadsheet className="w-4 h-4" /> Excel
      </Button>
      <Button size="sm" variant="outline" onClick={() => exportToPDF(data)}>
        <FileText className="w-4 h-4" /> PDF
      </Button>
    </div>
  );
}
