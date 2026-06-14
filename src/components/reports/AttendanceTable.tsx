interface AttendanceTableProps {
  data: Record<string, unknown>[];
}

export function AttendanceTable({ data }: AttendanceTableProps) {
  if (!data.length) {
    return <p className="text-center text-sm py-8" style={{ color: '#C9AFC4' }}>No attendance records found for the selected filters.</p>;
  }

  const headers = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto neu-card-static p-0">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-[#E8DDD9]">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#654D61' }}>
                {h.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E8DDD9]">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-[#E8DDD9]/50 transition-colors">
              {headers.map((h) => (
                <td key={h} className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: '#493944' }}>
                  {String(row[h] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs px-4 py-2" style={{ color: '#C9AFC4' }}>{data.length} record(s)</p>
    </div>
  );
}
