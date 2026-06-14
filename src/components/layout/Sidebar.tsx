import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, CalendarCheck, ClipboardList, BarChart3, Users, Settings, LogOut, GraduationCap, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/ui/NotificationBell';

const roleNavItems = {
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: CalendarCheck, label: 'Sessions', path: '/sessions' },
    { icon: ClipboardList, label: 'Reports', path: '/reports' },
    { icon: Users, label: 'Users', path: '/users' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ],
  professor: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: CalendarCheck, label: 'Sessions', path: '/sessions' },
    { icon: ClipboardList, label: 'Reports', path: '/reports' },
  ],
  student: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: BarChart3, label: 'Attendance', path: '/attendance' },
    { icon: ClipboardList, label: 'Reports', path: '/reports' },
  ],
};

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = roleNavItems[profile?.role ?? 'student'] || [];

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="w-9 h-9 bg-primary rounded-btn flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div className={cn('flex-1 min-w-0', collapsed && 'lg:hidden')}>
          <h1 className="text-base font-bold text-[#111827] tracking-tight">Attendify</h1>
          <p className="text-[10px] text-[#9CA3AF] font-medium uppercase tracking-wider">Attendance System</p>
        </div>
      </div>

      <nav className={cn('flex-1 px-3 py-2 space-y-0.5', collapsed && 'lg:px-2')}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary-50 text-primary'
                  : 'text-[#6B7280] hover:bg-gray-50 hover:text-[#111827]',
                collapsed && 'lg:justify-center lg:px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className={cn(collapsed && 'lg:hidden')}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className={cn('px-3 pb-4 space-y-1', collapsed && 'lg:px-2')}>
        <div className={cn('flex items-center gap-3 px-3 py-2.5', collapsed && 'lg:justify-center')}>
          <div className="w-8 h-8 bg-primary-50 rounded-btn flex items-center justify-center text-primary font-semibold text-sm shrink-0">
            {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className={cn('flex-1 min-w-0', collapsed && 'lg:hidden')}>
            <p className="text-sm font-medium text-[#111827] truncate">{profile?.full_name}</p>
            <p className="text-[10px] text-[#9CA3AF] font-medium uppercase">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium text-[#6B7280] hover:bg-red-50 hover:text-danger transition-all duration-150',
            collapsed && 'lg:justify-center'
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className={cn(collapsed && 'lg:hidden')}>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed left-0 top-0 h-full bg-white border-r border-gray-100 shadow-sidebar z-30 transition-all duration-200',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#9CA3AF] hover:text-[#111827] shadow-sm"
        >
          {collapsed ? '→' : '←'}
        </button>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-dropdown z-50 animate-slide-in-left">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 z-20 flex items-center justify-between px-4">
        <button onClick={() => setMobileOpen(true)} className="p-1.5 -ml-1.5 rounded-btn text-[#6B7280] hover:bg-gray-100">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold text-[#111827]">Attendify</span>
        </div>
        <NotificationBell />
      </div>
    </>
  );
}

export function BottomNav() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = roleNavItems[profile?.role ?? 'student'] || [];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 z-20 flex items-center justify-around px-2 pb-1">
      {navItems.slice(0, 5).map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              'mobile-nav-item',
              isActive && 'active'
            )}
          >
            <Icon className={cn('mobile-nav-icon', isActive ? 'text-primary' : 'text-[#9CA3AF]')} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
