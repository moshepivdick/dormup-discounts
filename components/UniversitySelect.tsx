'use client';

import { useEffect, useState, useRef } from 'react';
import { getUniversities } from '@/app/actions/universities';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/ui/loader';
import { cn } from '@/lib/utils';

type University = {
  id: string;
  name: string;
  city: string;
  emailDomains: string[];
};

type UniversitySelectProps = {
  value?: string;
  onChange: (universityId: string | undefined) => void;
  error?: string;
  disabled?: boolean;
};

export function UniversitySelect({
  value,
  onChange,
  error,
  disabled,
}: UniversitySelectProps) {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getUniversities().then((result) => {
      if (result.success && result.data) {
        setUniversities(result.data);
      }
      setLoading(false);
    });
  }, []);

  const selectedUniversity = universities.find((u) => u.id === value);

  const filteredUniversities = universities.filter((university) => {
    const query = search.toLowerCase();
    return (
      university.name.toLowerCase().includes(query) ||
      university.city.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-2">
      <label
        htmlFor="university-select"
        className="block text-sm font-medium text-slate-700"
      >
        University
      </label>
      <div className="relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger className="w-full">
            <div className="relative">
              <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                <svg
                  className="h-5 w-5 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <Input
                ref={inputRef}
                id="university-select"
                value={selectedUniversity?.name || ''}
                readOnly
                placeholder={loading ? 'Loading universities...' : 'Select your university'}
                onClick={() => !disabled && setOpen(true)}
                disabled={disabled || loading}
                className={cn(
                  'pl-12 pr-10 cursor-pointer',
                  error && 'border-rose-300 focus:border-rose-500 focus:ring-rose-200',
                )}
              />
              {selectedUniversity && !disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(undefined);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
              {!selectedUniversity && (
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                  <svg
                    className="h-5 w-5 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              )}
            </div>
          </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search universities..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader />
                  <span className="ml-2 text-sm text-slate-500">Loading...</span>
                </div>
              ) : filteredUniversities.length === 0 ? (
                <CommandEmpty>No universities found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredUniversities.map((university) => (
                    <CommandItem
                      key={university.id}
                      selected={value === university.id}
                      onSelect={() => {
                        onChange(university.id);
                        setOpen(false);
                        setSearch('');
                      }}
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{university.name}</div>
                          <div className="text-xs text-slate-500">{university.city}</div>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {university.city || 'Italy'}
                        </Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}

