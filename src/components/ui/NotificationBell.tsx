import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Clock, AlertTriangle, CalendarCheck, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppNotifications } from '@/contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

const typeIcons = {
  info: Info,
  success: CalendarCheck,
  warning: AlertTriangle,
  error: X,
};

const typeColors = {
  info: 'bg-blue-50 text-primary',
  success: 'bg-green-50 text-success',
  warning: 'bg-amber-50 text-warning',
  error: 'bg-red-50 text-danger',
};

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useAppNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (n: any) => {
    markAsRead(n.id);
    if (n.link) navigate(n.link);
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-btn text-[#6B7280] hover:bg-gray-100 hover:text-[#111827] transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-card shadow-dropdown border border-gray-100 animate-scale-in z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-[#111827]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:text-primary-600 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
                <p className="text-sm text-[#6B7280]">No notifications yet</p>
                <p className="text-xs text-[#9CA3AF] mt-1">Notifications will appear here in real-time</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = typeIcons[n.type];
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      'flex gap-3 px-4 py-3 transition-colors hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0',
                      !n.read && 'bg-primary-50/30'
                    )}
                  >
                    <div className={cn('p-1.5 rounded-btn shrink-0', typeColors[n.type])}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', !n.read ? 'font-semibold text-[#111827]' : 'text-[#6B7280]')}>
                        {n.title}
                      </p>
                      <p className="text-xs text-[#9CA3AF] mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-[#9CA3AF] mt-1">{n.time}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5" />}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // clear
                        }}
                        className="text-[#D1D5DB] hover:text-[#6B7280] transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
