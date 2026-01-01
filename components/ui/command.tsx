'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const Command = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white', className)}
    {...props}
  />
));
Command.displayName = 'Command';

interface CommandInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void;
}

const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, onValueChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onValueChange?.(e.target.value);
    };

    return (
      <input
        ref={ref}
        onChange={handleChange}
        className={cn(
          'flex h-11 w-full rounded-t-2xl border-b border-slate-200 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  }
);
CommandInput.displayName = 'CommandInput';

const CommandList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('max-h-[300px] overflow-y-auto p-1', className)}
    {...props}
  />
));
CommandList.displayName = 'CommandList';

const CommandEmpty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('py-6 text-center text-sm text-slate-500', className)}
    {...props}
  />
));
CommandEmpty.displayName = 'CommandEmpty';

const CommandGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('overflow-hidden p-1 text-slate-950', className)}
    {...props}
  />
));
CommandGroup.displayName = 'CommandGroup';

interface CommandItemProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  onSelect?: () => void;
}

const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({ className, selected, onSelect, onClick, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(e);
      onSelect?.();
    };

    return (
      <div
        ref={ref}
        onClick={handleClick}
        className={cn(
          'relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2 text-sm outline-none transition-colors',
          selected
            ? 'bg-[#014D40]/10 text-[#014D40]'
            : 'text-slate-900 hover:bg-slate-100',
          className,
        )}
        {...props}
      />
    );
  }
);
CommandItem.displayName = 'CommandItem';

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
};
