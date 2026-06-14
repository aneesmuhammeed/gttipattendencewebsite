import { useSearchParams } from 'react-router-dom';
import { AttendanceValidator } from '@/components/attendance/AttendanceValidator';
import { Card, CardContent } from '@/components/ui/Card';
import { ClipboardList } from 'lucide-react';

export default function Attendance() {
  const [searchParams] = useSearchParams();
  const sessionCode = searchParams.get('session');

  if (!sessionCode) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="text-center py-8">
          <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Session Code</h2>
          <p className="text-gray-500">
            Please use the attendance link shared by your instructor. It should contain a session code.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <AttendanceValidator sessionCode={sessionCode} />;
}
