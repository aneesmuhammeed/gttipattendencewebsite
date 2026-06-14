import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  size?: 'sm' | 'md';
}

const variants: Record<string, string> = {
  default: 'bg-gray-100 text-[#6B7280]',
  success: 'bg-green-50 text-success border border-green-200',
  warning: 'bg-amber-50 text-warning border border-amber-200',
  danger: 'bg-red-50 text-danger border border-red-200',
  info: 'bg-blue-50 text-primary border border-blue-200',
};

const sizes = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
