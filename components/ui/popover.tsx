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

      // Find trigger element
      const trigger = document.querySelector('[data-popover-trigger]') as HTMLElement;
      if (trigger) {
        triggerRef.current = trigger;
      }

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

      // Position content relative to trigger
      const updatePosition = () => {
        if (contentRef.current && triggerRef.current) {
          const triggerRect = triggerRef.current.getBoundingClientRect();
          const content = contentRef.current;
          
          content.style.position = 'fixed';
          content.style.top = `${triggerRect.bottom + sideOffset}px`;
          content.style.width = `${triggerRect.width}px`;
          
          if (align === 'start') {
            content.style.left = `${triggerRect.left}px`;
          } else if (align === 'end') {
            content.style.left = `${triggerRect.right - content.offsetWidth}px`;
          } else {
            content.style.left = `${triggerRect.left + (triggerRect.width - content.offsetWidth) / 2}px`;
          }
        }
      };

      // Update position on mount and resize
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }, [context.open, context, sideOffset, align]);

    if (!context.open) return null;

    return (
      <div
        ref={contentRef}
        className={cn(
          'z-50 rounded-2xl border border-slate-200 bg-white p-1 text-slate-950 shadow-md outline-none',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
      </div>
    );
  },
);
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent };
