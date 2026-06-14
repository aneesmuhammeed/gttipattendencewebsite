import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

export function useNotifications() {
  const permissionRef = useRef<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    permissionRef.current = result;
    return result === 'granted';
  }, []);

  const sendNotification = useCallback((payload: NotificationPayload) => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/vite.svg',
        tag: payload.tag,
      });
    } catch {
      // Silently fail if notification fails
    }
  }, []);

  const notifyAttendanceMarked = useCallback(() => {
    sendNotification({
      title: 'Attendance Marked ✓',
      body: 'Your attendance has been marked successfully.',
      tag: 'attendance-marked',
    });
  }, [sendNotification]);

  const notifyAttendanceMissed = useCallback(
    (sessionCode: string, date: string) => {
      sendNotification({
        title: 'Attendance Missed ⚠',
        body: `You missed attendance for session ${sessionCode} on ${date}.`,
        tag: `attendance-missed-${sessionCode}`,
      });
    },
    [sendNotification]
  );

  const notifyCorrectionApproved = useCallback(
    (date: string) => {
      sendNotification({
        title: 'Correction Approved ✓',
        body: `Your attendance correction for ${date} has been approved.`,
        tag: `correction-approved`,
      });
    },
    [sendNotification]
  );

  const notifyCorrectionRejected = useCallback(
    (date: string) => {
      sendNotification({
        title: 'Correction Rejected',
        body: `Your attendance correction for ${date} has been rejected.`,
        tag: `correction-rejected`,
      });
    },
    [sendNotification]
  );

  return {
    requestPermission,
    sendNotification,
    notifyAttendanceMarked,
    notifyAttendanceMissed,
    notifyCorrectionApproved,
    notifyCorrectionRejected,
    permission: permissionRef.current,
  };
}

// React component that requests permission on mount
export function NotificationGate({ children }: { children: React.ReactNode }) {
  const { requestPermission } = useNotifications();

  useEffect(() => {
    const timer = setTimeout(() => {
      requestPermission();
    }, 5000);
    return () => clearTimeout(timer);
  }, [requestPermission]);

  return <>{children}</>;
}

// Hook to subscribe to real-time correction status changes
export function useRealtimeCorrections(studentId: string | undefined) {
  const { notifyCorrectionApproved, notifyCorrectionRejected } = useNotifications();

  useEffect(() => {
    if (!studentId) return;

    const channel = supabase
      .channel('correction-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendance_correction_requests',
          filter: `student_id=eq.${studentId}`,
        },
        (payload) => {
          const record = payload.new as any;
          if (record.status === 'approved') {
            notifyCorrectionApproved(record.date || '');
          } else if (record.status === 'rejected') {
            notifyCorrectionRejected(record.date || '');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, notifyCorrectionApproved, notifyCorrectionRejected]);
}

// Hook to check if student missed today's attendance
export function useMissedAttendanceCheck(studentId: string | undefined) {
  const { notifyAttendanceMissed } = useNotifications();

  useEffect(() => {
    if (!studentId) return;

    const checkMissed = async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data: todaySessions } = await supabase
        .from('attendance_sessions')
        .select('session_code, attendance_date, end_time')
        .eq('attendance_date', today)
        .eq('is_active', false);

      if (!todaySessions || todaySessions.length === 0) return;

      const { data: myRecords } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('student_id', studentId)
        .eq('attendance_date', today);

      const now = new Date();
      const missedSessions = todaySessions.filter((s) => {
        const endParts = s.end_time.split(':');
        const endTime = new Date();
        endTime.setHours(Number(endParts[0]), Number(endParts[1]), Number(endParts[2]));
        return !myRecords?.length && endTime < now;
      });

      for (const session of missedSessions) {
        notifyAttendanceMissed(session.session_code, session.attendance_date);
      }
    };

    const timer = setTimeout(checkMissed, 3000);
    return () => clearTimeout(timer);
  }, [studentId, notifyAttendanceMissed]);
}
