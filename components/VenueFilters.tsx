import { useState, useEffect, type ReactNode } from 'react';

type FilterChipProps = {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  variant?: 'dark' | 'light';
};

function FilterChip({ children, active, onClick, variant = 'dark' }: FilterChipProps) {
  if (variant === 'light') {
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

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
        active
          ? 'bg-white text-emerald-700'
          : 'bg-white/10 text-white hover:bg-white/20'
      }`}
    >
      {children}
    </button>
  );
}

type VenueFiltersProps = {
  cities: string[];
  categories: string[];
  selectedCity: string;
  selectedCategory: string;
  onCityChange: (city: string) => void;
  onCategoryChange: (category: string) => void;
};

type VenueFiltersBottomSheetProps = VenueFiltersProps & {
  isOpen: boolean;
  onClose: () => void;
};

// Mobile bottom sheet overlay
export function VenueFiltersBottomSheet({
  cities,
  categories,
  selectedCity,
  selectedCategory,
  onCityChange,
  onCategoryChange,
  isOpen,
  onClose,
}: VenueFiltersBottomSheetProps) {
  // Prevent body scroll when open
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
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClearAll = () => {
    onCityChange('all');
    onCategoryChange('all');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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

        <div className="max-h-[60vh] space-y-6 overflow-y-auto pb-4">
          {/* City filters */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
              Filter by city
            </p>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={selectedCity === 'all'}
                onClick={() => onCityChange('all')}
                variant="light"
              >
                All
              </FilterChip>
              {cities.map((city) => (
                <FilterChip
                  key={city}
                  active={selectedCity === city}
                  onClick={() => onCityChange(city)}
                  variant="light"
                >
                  {city}
                </FilterChip>
              ))}
            </div>
          </div>

          {/* Category filters */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
              Filter by category
            </p>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={selectedCategory === 'all'}
                onClick={() => onCategoryChange('all')}
                variant="light"
              >
                All
              </FilterChip>
              {categories.map((category) => (
                <FilterChip
                  key={category}
                  active={selectedCategory === category}
                  onClick={() => onCategoryChange(category)}
                  variant="light"
                >
                  {category}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom buttons */}
        <div className="flex gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => {
              handleClearAll();
              onClose();
            }}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// Mobile compact filter bar
export function VenueFiltersMobileBar({
  cities,
  categories,
  selectedCity,
  selectedCategory,
  onOpenFilters,
}: VenueFiltersProps & { onOpenFilters: () => void }) {
  const hasActiveFilters = selectedCity !== 'all' || selectedCategory !== 'all';

  const getCityLabel = () => {
    return selectedCity === 'all' ? 'All' : selectedCity;
  };

  const getCategoryLabel = () => {
    return selectedCategory === 'all' ? 'All' : selectedCategory;
  };

  return (
    <div className="md:hidden mb-4">
      <button
        type="button"
        onClick={onOpenFilters}
        className="flex w-full items-center justify-between rounded-2xl bg-white/90 backdrop-blur px-4 py-3 shadow-lg"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <svg
            className="h-5 w-5 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              {(selectedCity !== 'all' ? 1 : 0) + (selectedCategory !== 'all' ? 1 : 0)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          {hasActiveFilters && (
            <>
              <span>
                <span className="font-medium">City:</span> {getCityLabel()}
              </span>
              <span>
                <span className="font-medium">Category:</span> {getCategoryLabel()}
              </span>
            </>
          )}
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
      </button>
    </div>
  );
}

// Desktop filter panel
export function VenueFiltersDesktop({
  cities,
  categories,
  selectedCity,
  selectedCategory,
  onCityChange,
  onCategoryChange,
}: VenueFiltersProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const hasActiveFilters = selectedCity !== 'all' || selectedCategory !== 'all';

  const handleClearAll = () => {
    onCityChange('all');
    onCategoryChange('all');
  };

  const getCityLabel = () => {
    return selectedCity === 'all' ? 'All' : selectedCity;
  };

  const getCategoryLabel = () => {
    return selectedCategory === 'all' ? 'All' : selectedCategory;
  };

  return (
    <div className="hidden md:block">
      <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-emerald-100 transition hover:text-white"
          >
            Filters
            <svg
              className={`h-4 w-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
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
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-semibold text-emerald-100 transition hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {!isCollapsed && (
          <div className="space-y-0">
            {/* City row */}
            <div>
              <button
                type="button"
                onClick={() => setIsCityOpen(!isCityOpen)}
                className="flex w-full items-center justify-between py-2 text-sm text-emerald-50 transition hover:text-white"
              >
                <span className="font-medium">City</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-100/80">{getCityLabel()}</span>
                  <svg
                    className={`h-4 w-4 transition-transform text-emerald-100/80 ${
                      isCityOpen ? 'rotate-180' : ''
                    }`}
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
              </button>
              {isCityOpen && (
                <div className="mb-2 flex flex-wrap gap-2 pb-3">
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
              )}
            </div>

            {/* Divider - show between rows */}
            <div className="my-1 border-t border-white/10" />

            {/* Category row */}
            <div>
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="flex w-full items-center justify-between py-2 text-sm text-emerald-50 transition hover:text-white"
              >
                <span className="font-medium">Category</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-100/80">{getCategoryLabel()}</span>
                  <svg
                    className={`h-4 w-4 transition-transform text-emerald-100/80 ${
                      isCategoryOpen ? 'rotate-180' : ''
                    }`}
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
              </button>
              {isCategoryOpen && (
                <div className="mb-2 flex flex-wrap gap-2 pb-3">
                  <FilterChip
                    active={selectedCategory === 'all'}
                    onClick={() => onCategoryChange('all')}
                  >
                    All
                  </FilterChip>
                  {categories.map((category) => (
                    <FilterChip
                      key={category}
                      active={selectedCategory === category}
                      onClick={() => onCategoryChange(category)}
                    >
                      {category}
                    </FilterChip>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
