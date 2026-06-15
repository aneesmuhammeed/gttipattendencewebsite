import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isUp: boolean;
  };
  subtitle?: string;
  className?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  delay?: number;
  onClick?: () => void;
}

const colorMap = {
  blue: 'bg-blue-50 text-primary',
  green: 'bg-green-50 text-success',
  amber: 'bg-amber-50 text-warning',
  red: 'bg-red-50 text-danger',
  purple: 'bg-purple-50 text-purple-600',
};

export function KpiCard({ title, value, icon, trend, subtitle, className, color = 'blue', delay = 0, onClick }: KpiCardProps) {
  return (
    <motion.div
      className={cn('bg-white rounded-card p-5 shadow-card', onClick && 'cursor-pointer hover:shadow-card-hover transition-shadow', className)}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.08 }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">{title}</p>
          <motion.p
            className="text-[28px] font-bold tracking-tight text-[#111827]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 + delay * 0.08 }}
          >
            {value}
          </motion.p>
          {subtitle && <p className="text-xs text-[#9CA3AF]">{subtitle}</p>}
        </div>
        <div className={cn('p-2.5 rounded-btn shrink-0', colorMap[color])}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-50">
          {trend.isUp ? (
            <TrendingUp className="w-3.5 h-3.5 text-success" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-danger" />
          )}
          <span className={cn('text-xs font-medium', trend.isUp ? 'text-success' : 'text-danger')}>
            {trend.value}%
          </span>
          <span className="text-xs text-[#9CA3AF]">vs last month</span>
        </div>
      )}
    </motion.div>
  );
}
