'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const PopoverContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({
  open: false,
  onOpenChange: () => {},
});

const Popover: React.FC<PopoverProps> = ({ open, onOpenChange, children }) => {
  return (
    <PopoverContext.Provider value={{ open, onOpenChange }}>
      {children}
    </PopoverContext.Provider>
  );
};

interface PopoverTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ asChild, children, className, onClick, ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(PopoverContext);
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);

    React.useImperativeHandle(ref, () => triggerRef.current as HTMLButtonElement);

    const handleClick = () => {
      onOpenChange(!open);
      onClick?.();
    };

    const setRef = (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref && 'current' in ref) {
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      }
    };

    if (asChild && React.isValidElement(children)) {
      const childElement = children as React.ReactElement<any>;
      // Extract ref safely using type assertion
      const elementWithRef = childElement as unknown as { ref?: React.Ref<HTMLButtonElement> };
      const originalRef = elementWithRef.ref;
      return React.cloneElement(childElement, {
        ...props,
        ref: (node: HTMLButtonElement | null) => {
          setRef(node);
          if (typeof originalRef === 'function') {
            originalRef(node);
          } else if (originalRef && typeof originalRef === 'object' && 'current' in originalRef) {
            (originalRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
          }
        },
        onClick: handleClick,
        'data-popover-trigger': true,
        className: cn(className, childElement.props.className),
      } as any);
    }
    return (
      <button
        ref={setRef}
        data-popover-trigger
        onClick={handleClick}
        className={cn(className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
PopoverTrigger.displayName = 'PopoverTrigger';

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = 'center', sideOffset = 4, children, ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(PopoverContext);
    const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLElement | null>(null);

    React.useImperativeHandle(ref, () => contentRef.current as HTMLDivElement);

    React.useEffect(() => {
      if (open) {
        const trigger = document.querySelector('[data-popover-trigger]') as HTMLElement;
        if (trigger) {
          triggerRef.current = trigger;
          const rect = trigger.getBoundingClientRect();
          setPosition({
            top: rect.bottom + sideOffset + window.scrollY,
            left: rect.left + window.scrollX,
          });
        }

        const handleClickOutside = (event: MouseEvent) => {
          const target = event.target as HTMLElement;
          if (
            contentRef.current &&
            !contentRef.current.contains(target) &&
            triggerRef.current &&
            !triggerRef.current.contains(target)
          ) {
            onOpenChange(false);
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
          document.removeEventListener('mousedown', handleClickOutside);
        };
      } else {
        setPosition(null);
      }
    }, [open, onOpenChange, sideOffset]);

    if (!open || !position) return null;

    const content = (
      <div
        ref={contentRef}
        data-popover-content
        className={cn(
          'fixed z-50 w-72 rounded-2xl border border-slate-200 bg-white p-1 text-slate-950 shadow-md outline-none',
          className,
        )}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        {...props}
      >
        {children}
      </div>
    );

    return typeof window !== 'undefined' ? createPortal(content, document.body) : content;
  }
);
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent };
