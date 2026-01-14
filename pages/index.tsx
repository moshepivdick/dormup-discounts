import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import type { GetServerSideProps } from 'next';
import { prisma } from '@/lib/prisma';
import { VenueCard } from '@/components/VenueCard';
import { BrandLogo } from '@/components/BrandLogo';
import { VenueFiltersDesktop } from '@/components/VenueFilters';
import { MobileFiltersSheet } from '@/components/MobileFiltersSheet';
import { haversineDistance } from '@/utils/distance';
import type { VenueSummary } from '@/types';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { VENUE_CATEGORY_VALUES, VENUE_CATEGORY_LABELS, mapLegacyCategory, isValidCategory } from '@/lib/constants/categories';

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
  }, [sortedVenues, selectedCity, selectedCategory, searchQuery]);

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
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200 sm:tracking-[0.5em]">
              DormUp Discounts
            </p>
            <h1 className="text-3xl font-bold sm:text-5xl">
              Student discounts - right where you are
            </h1>
            <p className="text-base text-emerald-50 sm:text-lg sm:w-2/3">
              We&apos;re starting in Rimini.
            </p>
          </div>
          {/* Desktop filters - hidden on mobile */}
          <div className="hidden md:block">
            <VenueFiltersDesktop
              cities={cities}
              categories={categories}
              selectedCity={selectedCity}
              selectedCategory={selectedCategory}
              onCityChange={setSelectedCity}
              onCategoryChange={setSelectedCategory}
            />
          </div>
          {/* Mobile filter icon button - shown in hero, only on mobile */}
          <div className="flex justify-end md:hidden">
            <MobileFiltersSheet
              cities={cities}
              categories={categories}
              selectedCity={selectedCity}
              selectedCategory={selectedCategory}
              onCityChange={setSelectedCity}
              onCategoryChange={setSelectedCategory}
            />
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


export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  try {
    // Try to fetch venues - use explicit select to avoid avgStudentBill field until migration is applied
    let venues;
    try {
      venues = await prisma.venue.findMany({
        select: {
          id: true,
          name: true,
          city: true,
          category: true,
          discountText: true,
          isActive: true,
          imageUrl: true,
          thumbnailUrl: true,
          openingHoursShort: true,
          latitude: true,
          longitude: true,
          priceLevel: true,
          typicalStudentSpendMin: true,
          typicalStudentSpendMax: true,
          // Explicitly exclude avgStudentBill to avoid P2022 error if column doesn't exist
        },
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
    });
    } catch (prismaError: any) {
      console.error('Prisma error fetching venues:', prismaError);
      // If error is about missing column (P2022), use raw SQL
      const isColumnError = 
        prismaError?.code === 'P2022' || 
        prismaError?.message?.includes('avgStudentBill') || 
        prismaError?.message?.includes('avg_student_bill') ||
        prismaError?.message?.includes('priceLevel') ||
        prismaError?.message?.includes('price_level') ||
        prismaError?.message?.includes('typicalStudentSpend') ||
        prismaError?.message?.includes('typical_student_spend');
      
      if (isColumnError) {
        console.log('Column error detected, using raw SQL query without price fields...');
        // Use raw SQL without price fields since they don't exist yet
        // This avoids trying to query non-existent columns
        venues = await (prisma as any).$queryRaw`
          SELECT id, name, city, category, "discountText", "isActive", 
                 "imageUrl", "thumbnailUrl", "openingHoursShort", 
                 latitude, longitude
          FROM "Venue"
          WHERE "isActive" = true
          ORDER BY city ASC, name ASC
        `;
        // Convert raw results to match expected format
        venues = venues.map((v: any) => ({
          id: Number(v.id),
          name: v.name,
          city: v.city,
          category: v.category,
          discountText: v.discountText,
          isActive: v.isActive ?? true,
          imageUrl: v.imageUrl,
          thumbnailUrl: v.thumbnailUrl,
          openingHoursShort: v.openingHoursShort,
          latitude: Number(v.latitude),
          longitude: Number(v.longitude),
          priceLevel: null,
          typicalStudentSpendMin: null,
          typicalStudentSpendMax: null,
        }));
      } else {
        throw prismaError;
      }
    }

    // Normalize categories to canonical values
    const payload: VenueSummary[] = venues.map((venue: any) => {
      const category = isValidCategory(venue.category) ? venue.category : mapLegacyCategory(venue.category);
      return {
        id: venue.id,
        name: venue.name,
        city: venue.city,
        category,
        discountText: venue.discountText,
        isActive: venue.isActive ?? true,
        imageUrl: venue.imageUrl,
        thumbnailUrl: venue.thumbnailUrl,
        openingHoursShort: venue.openingHoursShort,
        latitude: venue.latitude,
        longitude: venue.longitude,
        priceLevel: venue.priceLevel,
        typicalStudentSpendMin: venue.typicalStudentSpendMin,
        typicalStudentSpendMax: venue.typicalStudentSpendMax,
      };
    });

    const cities = Array.from(new Set(payload.map((venue) => venue.city))).sort();
    // Filter to only show canonical categories that exist in the data
    const venueCategories = payload.map((venue) => {
      const category = isValidCategory(venue.category) ? venue.category : mapLegacyCategory(venue.category);
      return category;
    });
    const categories = Array.from(new Set(venueCategories))
      .filter((cat) => VENUE_CATEGORY_VALUES.includes(cat))
      .sort((a, b) => {
        // Sort by canonical order
        const indexA = VENUE_CATEGORY_VALUES.indexOf(a);
        const indexB = VENUE_CATEGORY_VALUES.indexOf(b);
        return indexA - indexB;
      });

    console.log(`Successfully loaded ${payload.length} venues`);

    return {
      props: {
        venues: payload,
        cities,
        categories,
      },
    };
  } catch (error: any) {
    console.error('Error fetching venues in getServerSideProps:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    // Return empty data instead of crashing, but log the error
    return {
      props: {
        venues: [],
        cities: [],
        categories: [],
      },
    };
  }
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

