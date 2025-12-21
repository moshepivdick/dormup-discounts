'use client';

import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { getUniversities } from '@/app/actions/universities';
import { cn } from '@/lib/utils';
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
  disabled?: boolean;
};

export function UniversitySelect({ value, onValueChange, disabled }: UniversitySelectProps) {
  const [open, setOpen] = useState(false);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUniversities() {
      try {
        const result = await getUniversities();
        if (result.success && result.data) {
          setUniversities(result.data);
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className="w-full justify-between"
        >
          {selectedUniversity ? (
            <span className="truncate">{selectedUniversity.name}</span>
          ) : (
            <span className="text-slate-400">Select university...</span>
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
      <PopoverContent className="p-0" align="start">
        <Command>
          <CommandInput placeholder="Search university..." />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader size="sm" />
              </div>
            ) : (
              <>
                <CommandEmpty>No university found.</CommandEmpty>
                <CommandGroup>
                  {universities.map((university) => (
                    <CommandItem
                      key={university.id}
                      selected={value === university.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onValueChange(university.id);
                        setOpen(false);
                      }}
                      className={cn(
                        'cursor-pointer',
                        value === university.id && 'bg-slate-100'
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{university.name}</span>
                        {university.city && (
                          <span className="text-xs text-slate-500">{university.city}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
