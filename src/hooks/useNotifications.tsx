import { useCallback, useEffect, useRef } from 'react';

export function useBrowserNotifications() {
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

  const send = useCallback((title: string, body: string, tag?: string) => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, icon: '/vite.svg', tag });
    } catch {
      // silently fail
    }
  }, []);

  return { requestPermission, send, permission: permissionRef.current };
}

// React component that requests notification permission on mount
export function NotificationGate({ children }: { children: React.ReactNode }) {
  const { requestPermission } = useBrowserNotifications();

  useEffect(() => {
    const timer = setTimeout(() => {
      requestPermission();
    }, 5000);
    return () => clearTimeout(timer);
  }, [requestPermission]);

  return <>{children}</>;
}
