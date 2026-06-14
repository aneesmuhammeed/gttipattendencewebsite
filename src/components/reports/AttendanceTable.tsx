interface AttendanceTableProps {
  data: Record<string, unknown>[];
}

export function AttendanceTable({ data }: AttendanceTableProps) {
  if (!data.length) {
    return <p className="text-center text-gray-500 py-8">No attendance records found for the selected filters.</p>;
  }

  const headers = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {h.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {headers.map((h) => (
                <td key={h} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {String(row[h] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-gray-500 mt-2">{data.length} record(s)</p>
    </div>
  );
}
