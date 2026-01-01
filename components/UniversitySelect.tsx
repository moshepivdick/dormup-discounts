'use client';

import { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { getUniversities } from '@/app/actions/universities';
import { cn } from '@/lib/utils';
import { UniversityRequestDialog } from '@/components/UniversityRequestDialog';
import { Loader } from '@/components/ui/loader';

type University = {
  id: string;
  name: string;
  city: string;
  emailDomains: string[];
};

type UniversitySelectProps = {
  value?: string;
  onValueChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  prefilledEmail?: string;
};

export function UniversitySelect({
  value,
  onValueChange,
  error,
  disabled,
  prefilledEmail = '',
}: UniversitySelectProps) {
  const [open, setOpen] = useState(false);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  useEffect(() => {
    async function loadUniversities() {
      try {
        const result = await getUniversities();
        if (result.success && result.universities) {
          setUniversities(result.universities as University[]);
        }
      } catch (error) {
        console.error('Failed to load universities:', error);
      } finally {
        setLoading(false);
      }
    }
    loadUniversities();
  }, []);

  const selectedUniversity = universities.find((u) => u.id === value);

  // Filter universities based on search query
  const filteredUniversities = useMemo(() => {
    if (!searchQuery.trim()) {
      return universities;
    }

    const query = searchQuery.toLowerCase().trim();
    return universities.filter((university) => {
      const nameMatch = university.name.toLowerCase().includes(query);
      const cityMatch = university.city?.toLowerCase().includes(query);
      const domainMatch = university.emailDomains.some((domain) =>
        domain.toLowerCase().includes(query),
      );
      return nameMatch || cityMatch || domainMatch;
    });
  }, [universities, searchQuery]);

  const handleSelect = (universityId: string) => {
    onValueChange(universityId);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <>
      <div className="space-y-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled || loading}
              className={cn(
                'w-full justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 transition-all hover:bg-white hover:border-slate-300 focus:border-[#014D40] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#014D40]/20 disabled:cursor-not-allowed disabled:opacity-50',
                error && 'border-rose-300 focus:border-rose-400 focus:ring-rose-400/20',
                selectedUniversity && 'bg-white',
              )}
            >
              {loading ? (
                <span className="flex items-center gap-2 text-slate-500">
                  <Loader size="sm" />
                  <span>Loading universities...</span>
                </span>
              ) : selectedUniversity ? (
                <span className="truncate text-left flex items-center gap-2">
                  <svg
                    className="h-5 w-5 shrink-0 text-[#014D40]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                  <span>
                    <span className="font-medium text-slate-900">{selectedUniversity.name}</span>
                    {selectedUniversity.city && (
                      <span className="text-slate-500"> • {selectedUniversity.city}</span>
                    )}
                  </span>
                </span>
              ) : (
                <span className="text-slate-500">Select your university</span>
              )}
              <svg
                className={cn(
                  'ml-2 h-4 w-4 shrink-0 transition-transform',
                  open ? 'rotate-180' : 'rotate-0',
                  'text-slate-400',
                )}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0"
            align="start"
            sideOffset={8}
          >
            <Command className="rounded-2xl">
              <div className="flex items-center border-b border-slate-200 px-3">
                <svg
                  className="mr-2 h-4 w-4 shrink-0 text-slate-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <CommandInput
                  placeholder="Search by name, city, or domain..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="border-0 focus:ring-0"
                />
              </div>
              <CommandList className="max-h-[300px]">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader size="sm" />
                    <span className="ml-2 text-sm text-slate-500">Loading...</span>
                  </div>
                ) : filteredUniversities.length === 0 ? (
                  <CommandEmpty>
                    <div className="py-6 text-center">
                      <p className="text-sm font-medium text-slate-900">No university found</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Try a different search term
                      </p>
                    </div>
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {filteredUniversities.map((university) => {
                      const isSelected = value === university.id;
                      return (
                        <CommandItem
                          key={university.id}
                          selected={isSelected}
                          onSelect={() => handleSelect(university.id)}
                          className={cn(
                            'cursor-pointer rounded-xl px-3 py-2.5 transition-colors',
                            isSelected
                              ? 'bg-[#014D40]/10 text-[#014D40]'
                              : 'text-slate-900 hover:bg-slate-100',
                          )}
                        >
                          <div className="flex w-full flex-col gap-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium leading-tight">{university.name}</span>
                              {isSelected && (
                                <svg
                                  className="h-4 w-4 shrink-0 text-[#014D40]"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              )}
                            </div>
                            {university.city && (
                              <span className="text-xs text-slate-500">{university.city}</span>
                            )}
                            {university.emailDomains.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {university.emailDomains.slice(0, 2).map((domain, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                                  >
                                    {domain}
                                  </span>
                                ))}
                                {university.emailDomains.length > 2 && (
                                  <span className="text-xs text-slate-400">
                                    +{university.emailDomains.length - 2} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="text-sm text-slate-600">
          Can&apos;t find your university?{' '}
          <button
            type="button"
            onClick={() => setRequestDialogOpen(true)}
            className="font-medium text-[#014D40] hover:underline transition-colors"
          >
            Request it here
          </button>
        </div>
      </div>
      <UniversityRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        prefilledEmail={prefilledEmail}
      />
    </>
  );
}
