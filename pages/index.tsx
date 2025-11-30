import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import type { GetServerSideProps } from 'next';
import { prisma } from '@/lib/prisma';
import { VenueCard } from '@/components/VenueCard';
import { BrandLogo } from '@/components/BrandLogo';
import { haversineDistance } from '@/utils/distance';
import type { VenueSummary } from '@/types';
import { SiteLayout } from '@/components/layout/SiteLayout';

type HomeProps = {
  venues: VenueSummary[];
  cities: string[];
  categories: string[];
};

export default function HomePage({ venues, cities, categories }: HomeProps) {
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortedVenues, setSortedVenues] = useState<VenueSummary[]>(venues);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleSearchChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setSearchQuery(customEvent.detail);
    };

    const handleSelectVenue = (event: Event) => {
      const customEvent = event as CustomEvent<VenueSummary>;
      setSearchQuery(customEvent.detail.name);
      scrollToVenue(`venue-${customEvent.detail.id}`);
    };

    window.addEventListener('dormup:search-change', handleSearchChange);
    window.addEventListener('dormup:search-select', handleSelectVenue);

    return () => {
      window.removeEventListener('dormup:search-change', handleSearchChange);
      window.removeEventListener('dormup:search-select', handleSelectVenue);
    };
  }, []);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setSortedVenues(venues);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('User geolocation success:', {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        console.log('Using user position for distance sorting:', userLat, userLng);

        const enriched = venues.map((v) => {
          // latitude and longitude are now required, so we can always calculate distance
          const dist = haversineDistance(userLat, userLng, v.latitude, v.longitude);
          return { ...v, distance: dist };
        });

        enriched.sort((a, b) => {
          if (a.distance == null) return 1;
          if (b.distance == null) return -1;
          return a.distance - b.distance;
        });

        console.log('Venues sorted by distance:', enriched.map((v) => ({
          name: v.name,
          distance: v.distance ? `${Math.round(v.distance)}m` : 'N/A',
        })));
        setSortedVenues(enriched);
      },
      (err) => {
        console.warn('User geolocation ERROR:', err);
        // permission denied → keep default order
        console.log('Falling back to default alphabetical order');
        setSortedVenues(venues);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [venues]);

  const filteredVenues = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const filtered = sortedVenues.filter((venue) => {
      const cityMatch =
        selectedCity === 'all' ? true : venue.city === selectedCity;
      const categoryMatch =
        selectedCategory === 'all' ? true : venue.category === selectedCategory;
      const searchMatch = normalizedSearch
        ? venue.name.toLowerCase().includes(normalizedSearch)
        : true;
      return cityMatch && categoryMatch && searchMatch;
    });
    
    // Re-sort filtered venues by distance if distance is available
    // This ensures that when filters are applied, venues are still sorted by distance
    return filtered.sort((a, b) => {
      if (a.distance == null && b.distance == null) return 0;
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });
  }, [sortedVenues, selectedCity, selectedCategory]);

  const heroWordmark = (
    <span className="inline-flex items-center text-[16px] font-bold tracking-tight text-[#d9ead3] sm:text-[18px]">
      <span>Dorm</span>
      <span className="ml-1 font-semibold text-[#CC2A32] drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.35)]">
        Up
      </span>
    </span>
  );

  return (
    <>
      <Head>
        <title>DormUp Discounts</title>
        <meta
          name="description"
          content="Student discounts across partner cafes, pizzerias and bars in Rimini & Bologna."
        />
      </Head>
      <section className="bg-gradient-to-br from-slate-900 via-emerald-900 to-emerald-600 pb-16 pt-24 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6">
          <div className="space-y-4 text-center sm:text-left">
            <p className="text-sm uppercase tracking-[0.5em] text-emerald-200">
              {heroWordmark}
            </p>
            <h1 className="text-4xl font-bold sm:text-5xl">
              Student discounts in Rimini &amp; Bologna
            </h1>
            <p className="text-lg text-emerald-50 sm:w-2/3">
              Browse curated cafes, street food, and late-night venues that reward{' '}
              {heroWordmark} members every day.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 rounded-3xl bg-white/10 p-6 backdrop-blur sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-100">
                Filter by city
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <FilterChip
                  active={selectedCity === 'all'}
                  onClick={() => setSelectedCity('all')}
                >
                  All
                </FilterChip>
                {cities.map((city) => (
                  <FilterChip
                    key={city}
                    active={selectedCity === city}
                    onClick={() => setSelectedCity(city)}
                  >
                    {city}
                  </FilterChip>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-100">
                Filter by category
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <FilterChip
                  active={selectedCategory === 'all'}
                  onClick={() => setSelectedCategory('all')}
                >
                  All
                </FilterChip>
                {categories.map((category) => (
                  <FilterChip
                    key={category}
                    active={selectedCategory === category}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </FilterChip>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="-mt-12 bg-slate-50 pb-12 pt-4">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6">
            {filteredVenues.length === 0 ? (
              <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white/80 p-10 text-center text-slate-600">
                No venues for this selection yet. Check back soon!
              </div>
            ) : (
              filteredVenues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))
            )}
          </div>
        </div>
      </section>
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto w-full max-w-6xl px-6">
          <p className="text-center text-xs text-slate-500">
            Own a bar or cafe?{' '}
            <Link
              href="/for-business"
              className="font-medium text-slate-700 hover:text-emerald-600 transition"
            >
              <BrandLogo /> for Business
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}

type ChipProps = {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
};

function FilterChip({ children, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-white text-emerald-700'
          : 'bg-white/10 text-white hover:bg-white/20'
      }`}
    >
      {children}
    </button>
  );
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  const venues = await prisma.venue.findMany({
    where: { isActive: true },
    orderBy: [{ city: 'asc' }, { name: 'asc' }],
  });

  const payload: VenueSummary[] = venues.map((venue) => ({
    id: venue.id,
    name: venue.name,
    city: venue.city,
    category: venue.category,
    discountText: venue.discountText,
    isActive: venue.isActive,
    imageUrl: venue.imageUrl,
    thumbnailUrl: venue.thumbnailUrl,
    openingHoursShort: venue.openingHoursShort,
    latitude: venue.latitude,
    longitude: venue.longitude,
  }));

  const cities = Array.from(new Set(payload.map((venue) => venue.city))).sort();
  const categories = Array.from(
    new Set(payload.map((venue) => venue.category)),
  ).sort();

  return {
    props: {
      venues: payload,
      cities,
      categories,
    },
  };
};

HomePage.getLayout = function getLayout(page: ReactElement, pageProps: HomeProps) {
  return (
    <SiteLayout searchBarVenues={pageProps.venues}>
      {page}
    </SiteLayout>
  );
};

export function scrollToVenue(id: string) {
  if (typeof window === 'undefined') return;
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

