import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

type SearchResult = {
  id: number;
  name: string;
  city: string;
  category: string;
  thumbnailUrl?: string | null;
};

export function VenueSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const searchVenues = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/venues/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setIsOpen(data.length > 0 || searchQuery.trim().length > 0);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error searching venues:', error);
      setResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      searchVenues(query);
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, searchVenues]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleInputFocus = () => {
    if (results.length > 0 || query.trim().length > 0) {
      setIsOpen(true);
    }
  };

  const handleResultClick = () => {
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && results.length > 0) {
      router.push(`/venues/${results[0].id}`);
      handleResultClick();
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search venues..."
        value={query}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        className="w-full max-w-xs rounded-2xl bg-white/90 border border-neutral-200 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      />
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full max-w-xs rounded-2xl bg-white shadow-lg border border-neutral-200 overflow-hidden"
        >
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-neutral-500">Searching...</div>
          ) : results.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              {results.map((venue) => (
                <Link
                  key={venue.id}
                  href={`/venues/${venue.id}`}
                  onClick={handleResultClick}
                  className="block px-3 py-2 text-sm hover:bg-neutral-50 cursor-pointer flex flex-col transition-colors"
                >
                  <span className="font-medium text-slate-900">{venue.name}</span>
                  <span className="text-xs text-neutral-500">
                    {venue.city} · {venue.category}
                  </span>
                </Link>
              ))}
            </div>
          ) : query.trim().length > 0 ? (
            <div className="px-3 py-2 text-sm text-neutral-500">No places found</div>
          ) : null}
        </div>
      )}
    </div>
  );
}

