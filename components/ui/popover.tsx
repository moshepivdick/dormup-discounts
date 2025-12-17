'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const Popover: React.FC<PopoverProps> = ({ open, onOpenChange, children }) => {
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-popover]')) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onOpenChange]);

  return <>{children}</>;
};

const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn('outline-none', className)}
    data-popover
    {...props}
  />
));
PopoverTrigger.displayName = 'PopoverTrigger';

const PopoverContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-popover
    className={cn(
      'absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg',
      className,
    )}
    {...props}
  />
));
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent };

