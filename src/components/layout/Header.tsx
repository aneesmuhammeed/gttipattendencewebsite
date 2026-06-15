import { useAuth } from '@/contexts/AuthContext';
import { GraduationCap } from 'lucide-react';

export function Header() {
  const { profile } = useAuth();

  return (
    <header className="hidden lg:flex h-16 bg-white border-b border-gray-100 shadow-header items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-success" />
        <span className="text-sm text-[#6B7280]">
          Welcome back, <span className="font-semibold text-[#111827]">{profile?.full_name || 'User'}</span>
        </span>
      </div>
    </header>
  );
}
