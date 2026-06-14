import { Button } from '@/components/ui/Button';
import { FileText, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';

interface ExportButtonsProps {
  data: Record<string, unknown>[];
  filename?: string;
}

export function ExportButtons({ data, filename = 'attendance-report' }: ExportButtonsProps) {
  const exportCSV = () => {
    if (!data.length) {
      toast.error('No data to export');
      return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
      csvRows.push(headers.map((h) => `"${String(row[h] ?? '')}"`).join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const exportExcel = () => {
    if (!data.length) {
      toast.error('No data to export');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success('Excel exported');
  };

  const exportPDF = () => {
    if (!data.length) {
      toast.error('No data to export');
      return;
    }
    const doc = new jsPDF();
    const headers = Object.keys(data[0]);
    const rows = data.map((row) => headers.map((h) => String(row[h] ?? '')));

    doc.text('Attendance Report', 14, 15);
    (doc as any).autoTable({
      head: [headers],
      body: rows,
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save(`${filename}.pdf`);
    toast.success('PDF exported');
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={exportCSV}>
        <Download className="w-4 h-4 mr-1" /> CSV
      </Button>
      <Button size="sm" variant="outline" onClick={exportExcel}>
        <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
      </Button>
      <Button size="sm" variant="outline" onClick={exportPDF}>
        <FileText className="w-4 h-4 mr-1" /> PDF
      </Button>
    </div>
  );
}
