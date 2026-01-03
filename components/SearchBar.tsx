import { useEffect, useMemo, useRef, useState } from 'react';
import type { VenueSummary } from '@/types';

export interface SearchBarProps {
  venues: VenueSummary[];
  onSelectVenue?: (venue: VenueSummary) => void;
  onSearchChange?: (value: string) => void;
}

export function SearchBar({
  venues,
  onSelectVenue,
  onSearchChange,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const blurTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimeout.current) {
        clearTimeout(blurTimeout.current);
      }
    };
  }, []);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const normalized = query.toLowerCase();
    return venues
      .filter((venue) =>
        venue.name.toLowerCase().includes(normalized),
      )
      .slice(0, 6);
  }, [query, venues]);

  const handleSelect = (venue: VenueSummary) => {
    setQuery(venue.name);
    onSearchChange?.(venue.name);
    onSelectVenue?.(venue);
    setIsFocused(false);
  };

  const handleBlur = () => {
    blurTimeout.current = setTimeout(() => setIsFocused(false), 120);
  };

  return (
    <div className="relative w-full min-w-0 sm:max-w-sm">
      <input
        type="text"
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          onSearchChange?.(value);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        placeholder="Search"
        className="w-full min-w-0 h-9 rounded-full border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:px-4 sm:py-2 sm:h-auto"
      />
      {isFocused && query.trim() && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-72 overflow-auto rounded-xl border border-slate-100 bg-white shadow-xl">
          <ul className="divide-y divide-slate-100">
            {suggestions.map((venue) => (
              <li key={venue.id}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(venue)}
                >
                  <span className="font-medium text-slate-900">
                    {venue.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {venue.city} · {venue.category}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


