'use client';

import { useState, useEffect } from 'react';
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
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  useEffect(() => {
    async function loadUniversities() {
      const result = await getUniversities();
      if (result.success && result.universities) {
        setUniversities(result.universities as University[]);
      }
      setLoading(false);
    }
    loadUniversities();
  }, []);

  const selectedUniversity = universities.find((u) => u.id === value);

  return (
    <>
      <div className="space-y-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled || loading}
              className={cn(
                'w-full justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 transition-all hover:bg-white focus:border-[#014D40] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#014D40]/20 disabled:cursor-not-allowed disabled:opacity-50',
                error && 'border-rose-300',
              )}
            >
              {loading ? (
                'Loading universities...'
              ) : selectedUniversity ? (
                <span className="truncate">
                  {selectedUniversity.name}
                  {selectedUniversity.city && ` (${selectedUniversity.city})`}
                </span>
              ) : (
                'Select your university'
              )}
              <svg
                className="ml-2 h-4 w-4 shrink-0 opacity-50"
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
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Search universities..." />
              <CommandList>
                <CommandEmpty>No university found.</CommandEmpty>
                <CommandGroup>
                  {universities.map((university) => (
                    <CommandItem
                      key={university.id}
                      selected={value === university.id}
                      onSelect={() => {
                        onValueChange(university.id);
                        setOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{university.name}</span>
                        {university.city && (
                          <span className="text-xs text-slate-500">{university.city}</span>
                        )}
                        {university.emailDomains.length > 0 && (
                          <span className="text-xs text-slate-400">
                            {university.emailDomains.join(', ')}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
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
            className="font-medium text-[#014D40] hover:underline"
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
