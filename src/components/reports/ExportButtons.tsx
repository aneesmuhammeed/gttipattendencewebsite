import { Button } from '@/components/ui/Button';
import { FileText, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';

export function exportToCSV(data: any[], _filters?: any) {
  if (!data.length) { toast.error('No data to export'); return; }
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  for (const row of data) {
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
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  XLSX.writeFile(wb, 'attendance-report.xlsx');
  toast.success('Excel exported');
}

export function exportToPDF(data: any[], _filters?: any) {
  if (!data.length) { toast.error('No data to export'); return; }
  const doc = new jsPDF();
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((h) => String(row[h] ?? '')));
  doc.text('Attendance Report', 14, 15);
  (doc as any).autoTable({
    head: [headers],
    body: rows,
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
