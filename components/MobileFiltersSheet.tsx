import { useState, useEffect, type ReactNode } from 'react';
import { VENUE_CATEGORY_LABELS } from '@/lib/constants/categories';

type FilterChipProps = {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
};

function FilterChip({ children, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
        active
          ? 'bg-emerald-600 text-white'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

type MobileFiltersSheetProps = {
  cities: string[];
  categories: string[];
  selectedCity: string;
  selectedCategory: string;
  onCityChange: (city: string) => void;
  onCategoryChange: (category: string) => void;
};

export function MobileFiltersSheet({
  cities,
  categories,
  selectedCity,
  selectedCategory,
  onCityChange,
  onCategoryChange,
}: MobileFiltersSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleClearAll = () => {
    onCityChange('all');
    onCategoryChange('all');
    // Keep sheet open so user sees filters reset
  };

  const handleApply = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Filter icon button - only visible on mobile */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-full bg-white px-3 py-2 shadow-sm transition hover:shadow-md md:hidden"
        aria-label="Open filters"
      >
        <svg
          className="h-5 w-5 text-slate-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Full-screen filter sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-900">Filters</h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close filters"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-8">
              {/* City filters */}
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  FILTER BY CITY
                </p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip
                    active={selectedCity === 'all'}
                    onClick={() => onCityChange('all')}
                  >
                    All
                  </FilterChip>
                  {cities.map((city) => (
                    <FilterChip
                      key={city}
                      active={selectedCity === city}
                      onClick={() => onCityChange(city)}
                    >
                      {city}
                    </FilterChip>
                  ))}
                </div>
              </div>

              {/* Category filters */}
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  FILTER BY CATEGORY
                </p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip
                    active={selectedCategory === 'all'}
                    onClick={() => onCategoryChange('all')}
                  >
                    All
                  </FilterChip>
                  {categories.map((category) => {
                    // Display label for canonical categories, fallback to raw value
                    const label = VENUE_CATEGORY_LABELS[category as keyof typeof VENUE_CATEGORY_LABELS] || category;
                    return (
                      <FilterChip
                        key={category}
                        active={selectedCategory === category}
                        onClick={() => onCategoryChange(category)}
                      >
                        {label}
                      </FilterChip>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClearAll}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
