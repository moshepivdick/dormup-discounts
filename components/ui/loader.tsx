import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

export function Loader({ className, size = 'md', ...props }: LoaderProps) {
  return (
    <div
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-slate-300 border-t-[#014D40]',
        {
          'h-4 w-4': size === 'sm',
          'h-6 w-6': size === 'md',
          'h-8 w-8': size === 'lg',
        },
        className,
      )}
      {...props}
    />
  );
}

