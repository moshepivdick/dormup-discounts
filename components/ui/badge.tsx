import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
        {
          'bg-slate-100 text-slate-600': variant === 'default',
          'bg-slate-200 text-slate-700': variant === 'secondary',
          'border border-slate-300 text-slate-700': variant === 'outline',
        },
        className,
      )}
      {...props}
    />
  );
}

export { Badge };





