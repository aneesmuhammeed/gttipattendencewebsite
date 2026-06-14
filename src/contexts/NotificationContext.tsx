import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserRole, Profile } from '@/types';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
  read: boolean;
  timestamp: number;
  link?: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, 'id' | 'time' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'attendify-notifications';
const MAX_NOTIFICATIONS = 50;

function loadFromStorage(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AppNotification[];
  } catch {
    return [];
  }
}

function saveToStorage(notifications: AppNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  } catch {
    // storage full or unavailable
  }
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

let idCounter = 0;
function generateId(): string {
  return `notif-${Date.now()}-${++idCounter}`;
}

function sendBrowserNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/vite.svg' });
  } catch {
    // silently fail
  }
}

export function NotificationProvider({ children, profile }: { children: ReactNode; profile: Profile | null }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(loadFromStorage);
  const processedRef = useRef(new Set<string>());

  // Persist to localStorage on change
  useEffect(() => {
    saveToStorage(notifications);
  }, [notifications]);

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'time' | 'timestamp' | 'read'>) => {
    const timestamp = Date.now();
    const id = generateId();
    const notification: AppNotification = {
      ...n,
      id,
      time: formatTimeAgo(timestamp),
      timestamp,
      read: false,
    };
    setNotifications((prev) => [notification, ...prev].slice(0, MAX_NOTIFICATIONS));
    sendBrowserNotification(n.title, n.message);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Update time ago periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, time: formatTimeAgo(n.timestamp) }))
      );
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Real-time subscriptions based on role
  useEffect(() => {
    if (!profile) return;
    const isStudent = profile.role === 'student';
    const isProfessor = profile.role === 'professor';
    const isAdmin = profile.role === 'admin';

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // All roles: listen for own correction request status changes
    if (isStudent) {
      const corrChannel = supabase
        .channel('notif-corr-student')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'attendance_correction_requests',
            filter: `student_id=eq.${profile.id}`,
          },
          (payload) => {
            const record = payload.new as any;
            const dedupKey = `corr-status-${record.id}`;
            if (processedRef.current.has(dedupKey)) return;
            processedRef.current.add(dedupKey);

            if (record.status === 'approved') {
              addNotification({
                title: 'Correction Approved',
                message: `Your attendance correction for ${record.date || 'the requested date'} has been approved.`,
                type: 'success',
              });
            } else if (record.status === 'rejected') {
              addNotification({
                title: 'Correction Rejected',
                message: `Your attendance correction for ${record.date || 'the requested date'} has been rejected.`,
                type: 'error',
              });
            }

            setTimeout(() => processedRef.current.delete(dedupKey), 5000);
          }
        )
        .subscribe();
      channels.push(corrChannel);

      const sessionChannel = supabase
        .channel('notif-sessions-student')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'attendance_sessions',
          },
          (payload) => {
            const record = payload.new as any;
            const dedupKey = `session-new-${record.id}`;
            if (processedRef.current.has(dedupKey)) return;
            processedRef.current.add(dedupKey);

            addNotification({
              title: 'New Session',
              message: `Session ${record.session_code} is now active. Mark your attendance!`,
              type: 'info',
              link: `/attendance?session=${record.session_code}`,
            });

            setTimeout(() => processedRef.current.delete(dedupKey), 5000);
          }
        )
        .subscribe();
      channels.push(sessionChannel);
    }

    // Professors & Admins: listen for new correction requests and attendance records
    if (isProfessor || isAdmin) {
      const newCorrChannel = supabase
        .channel('notif-corr-staff')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'attendance_correction_requests',
          },
          (payload) => {
            const record = payload.new as any;
            const dedupKey = `corr-new-${record.id}`;
            if (processedRef.current.has(dedupKey)) return;
            processedRef.current.add(dedupKey);

            addNotification({
              title: 'New Correction Request',
              message: `A student has requested an attendance correction.`,
              type: 'warning',
              link: '/dashboard',
            });

            setTimeout(() => processedRef.current.delete(dedupKey), 5000);
          }
        )
        .subscribe();
      channels.push(newCorrChannel);

      const attChannel = supabase
        .channel('notif-attendance-staff')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'attendance_records',
          },
          (payload) => {
            const record = payload.new as any;
            const dedupKey = `att-new-${record.id}`;
            if (processedRef.current.has(dedupKey)) return;
            processedRef.current.add(dedupKey);

            addNotification({
              title: 'Attendance Marked',
              message: `A student has marked their attendance.`,
              type: 'success',
            });

            setTimeout(() => processedRef.current.delete(dedupKey), 5000);
          }
        )
        .subscribe();
      channels.push(attChannel);
    }

    // Admins: also listen for new sessions
    if (isAdmin) {
      const sessionChannel = supabase
        .channel('notif-sessions-admin')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'attendance_sessions',
          },
          (payload) => {
            const record = payload.new as any;
            const dedupKey = `session-admin-${record.id}`;
            if (processedRef.current.has(dedupKey)) return;
            processedRef.current.add(dedupKey);

            addNotification({
              title: 'Session Created',
              message: `Session ${record.session_code} has been created.`,
              type: 'info',
            });

            setTimeout(() => processedRef.current.delete(dedupKey), 5000);
          }
        )
        .subscribe();
      channels.push(sessionChannel);
    }

    // All roles: listen for session expiry
    if (isStudent || isProfessor) {
      const sessionUpdateChannel = supabase
        .channel('notif-sessions-update')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'attendance_sessions',
            filter: `is_active=eq.false`,
          },
          (payload) => {
            const record = payload.new as any;
            const old = payload.old as any;
            const dedupKey = `session-exp-${record.id}`;
            if (old?.is_active === true && record.is_active === false) {
              if (processedRef.current.has(dedupKey)) return;
              processedRef.current.add(dedupKey);

              addNotification({
                title: 'Session Expired',
                message: `Session ${record.session_code} has ended.`,
                type: 'warning',
              });

              setTimeout(() => processedRef.current.delete(dedupKey), 5000);
            }
          }
        )
        .subscribe();
      channels.push(sessionUpdateChannel);
    }

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [profile, addNotification]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useAppNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useAppNotifications must be used within NotificationProvider');
  return ctx;
}
