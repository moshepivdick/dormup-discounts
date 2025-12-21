'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type PopoverContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const PopoverContext = React.createContext<PopoverContextType | undefined>(undefined);

type PopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

const Popover = ({ open, onOpenChange, children }: PopoverProps) => {
  return (
    <PopoverContext.Provider value={{ open, setOpen: onOpenChange }}>
      {children}
    </PopoverContext.Provider>
  );
};

const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild, children, onClick, className, ...props }, ref) => {
  const context = React.useContext(PopoverContext);
  if (!context) throw new Error('PopoverTrigger must be used within Popover');

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    context.setOpen(!context.open);
    onClick?.(e);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: handleClick,
      ref,
      'data-popover-trigger': true,
    } as any);
  }

  return (
    <button
      ref={ref}
      onClick={handleClick}
      data-popover-trigger
      className={cn('relative', className)}
      {...props}
    >
      {children}
    </button>
  );
});
PopoverTrigger.displayName = 'PopoverTrigger';

type PopoverContentProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
};

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = 'center', sideOffset = 4, children, ...props }, ref) => {
    const context = React.useContext(PopoverContext);
    if (!context) throw new Error('PopoverContent must be used within Popover');
    const contentRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLElement | null>(null);

    React.useEffect(() => {
      if (typeof ref === 'object' && ref !== null && 'current' in ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = contentRef.current;
      }
    }, [ref]);

    React.useEffect(() => {
      if (!context.open) return;

      const handleClickOutside = (e: MouseEvent) => {
        if (contentRef.current) {
          if (!contentRef.current.contains(e.target as Node)) {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-popover-trigger]')) {
              context.setOpen(false);
            }
          }
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [context.open, context]);

    if (!context.open) return null;

    return (
      <div
        ref={contentRef}
        className={cn(
          'absolute z-50 w-72 rounded-2xl border border-slate-200 bg-white p-1 text-slate-950 shadow-md outline-none',
          className,
        )}
        style={{ marginTop: `${sideOffset}px` }}
        {...props}
      >
        {children}
      </div>
    );
  },
);
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent };
