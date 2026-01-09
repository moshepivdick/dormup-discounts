import Image from 'next/image';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { useCallback, useEffect, useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import { prisma } from '@/lib/prisma';
import { BrandLogo } from '@/components/BrandLogo';
import { PartnerLocationCard } from '@/components/partner/PartnerLocationCard';
import {
  parseOpeningRangeFromShort,
  isOpenNow,
  formatTimeLabel,
} from '@/utils/opening';
import type { VenueDetails } from '@/types';
import {
  extractAddressFromDetails,
  removeAddressFromDetails,
  buildFullAddress,
} from '@/utils/address';

type VenuePageProps = {
  venue: VenueDetails;
};

export default function VenuePage({ venue }: VenuePageProps) {
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<Date | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [showExpiredMessage, setShowExpiredMessage] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [openingRange, setOpeningRange] = useState<ReturnType<typeof parseOpeningRangeFromShort> | null>(null);

  useEffect(() => {
    fetch('/api/analytics/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venueId: venue.id, city: venue.city }),
    }).catch(() => null);
  }, [venue.id, venue.city]);

  // Extract address from details and prepare partner location data
  const extractedAddress = extractAddressFromDetails(venue.details);
  const fullAddress = buildFullAddress(extractedAddress, venue.city);
  const detailsWithoutAddress = removeAddressFromDetails(venue.details);

  // Prepare partner location data for PartnerLocationCard
  // Note: mapUrl is ignored - map is always generated from coordinates
  const partnerLocationData = {
    name: venue.name,
    address: fullAddress,
    latitude: venue.latitude,
    longitude: venue.longitude,
  };

  // Format countdown timer as MM:SS
  const formatCountdown = (seconds: number): string => {
    const s = Math.max(0, seconds);
    const minutes = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // API-based discount code generation
  const handleGenerateDiscount = useCallback(async () => {
    try {
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: venue.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to generate code:', error);
        return;
      }

      const data = await response.json();
      if (!data.success) {
        console.error('Failed to generate code:', data.message);
        return;
      }

      const newCode = data.data.code;
      const expiresAt = new Date(data.data.expiresAt);
      const now = new Date();
      
      setDiscountCode(newCode);
      setCodeExpiresAt(expiresAt);
      const secondsUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
      setRemainingSeconds(Math.max(0, secondsUntilExpiry));
      setShowExpiredMessage(false);
    } catch (error) {
      console.error('Error generating discount code:', error);
    }
  }, [venue.id]);

  // Track if expiration has been handled to prevent multiple timeouts
  const expirationHandledRef = useRef(false);

  // Countdown timer effect - based on expiresAt from server
  useEffect(() => {
    if (codeExpiresAt === null || remainingSeconds === null) {
      expirationHandledRef.current = false;
      return;
    }

    let expiredTimeout: NodeJS.Timeout | null = null;

    const updateCountdown = () => {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((codeExpiresAt!.getTime() - now.getTime()) / 1000));
      
      setRemainingSeconds(remaining);

      // When timer expires, clear the code (only once)
      if (remaining === 0 && !expirationHandledRef.current) {
        expirationHandledRef.current = true;
        setShowExpiredMessage(true);
        // Show expired message briefly, then clear
        expiredTimeout = setTimeout(() => {
          setDiscountCode(null);
          setCodeExpiresAt(null);
          setRemainingSeconds(null);
          setShowExpiredMessage(false);
          expirationHandledRef.current = false;
        }, 2000); // Show "Code expired" for 2 seconds
      }
    };

    // Initial calculation
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => {
      clearInterval(interval);
      if (expiredTimeout) {
        clearTimeout(expiredTimeout);
      }
    };
  }, [codeExpiresAt, remainingSeconds]);

  const isTimerActive = remainingSeconds !== null && remainingSeconds > 0;
  const isTimerExpired = remainingSeconds === 0;

  // Compute opening status on client side only
  useEffect(() => {
    const range = parseOpeningRangeFromShort(venue.openingHoursShort);
    setOpeningRange(range);
    if (range) {
      setIsOpen(isOpenNow(range));
    }
  }, [venue.openingHoursShort]);

  return (
    <>
      <Head>
        <title>{venue.name} | DormUp Discounts</title>
      </Head>
      <section className="bg-gradient-to-br from-slate-900 via-emerald-900 to-emerald-600 pb-24 pt-12 text-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6">
          <Link
            href="/"
            className="text-sm font-medium text-emerald-200 transition hover:text-white"
          >
            ← Back to all venues
          </Link>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-100">
              {venue.city} · {venue.category}
            </p>
            <h1 className="text-4xl font-bold sm:text-5xl">{venue.name}</h1>
            <p className="text-lg text-emerald-50">{venue.discountText}</p>
            {venue.openingHoursShort && (
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-200">
                {venue.openingHoursShort}
              </p>
            )}
          </div>
          {(venue.thumbnailUrl ?? venue.imageUrl) && (
            <div className="overflow-hidden rounded-3xl border border-white/20">
              <Image
                src={venue.thumbnailUrl ?? venue.imageUrl ?? ''}
                alt={`${venue.name} venue`}
                width={1200}
                height={600}
                className="h-72 w-full object-cover"
                priority
              />
            </div>
          )}
        </div>
      </section>
      <section className="-mt-16 pb-24 pt-4">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-6 lg:grid-cols-2 lg:items-start">
          <div className="rounded-3xl border border-neutral-100 bg-white/90 p-5 shadow-sm">
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleGenerateDiscount}
                disabled={isTimerActive}
                className="w-full inline-flex items-center justify-center rounded-2xl bg-emerald-600 text-white px-5 py-3 text-base font-semibold shadow-md hover:bg-emerald-700 hover:brightness-110 active:scale-[0.97] transition-transform transition-all duration-150 disabled:cursor-not-allowed disabled:bg-emerald-400 disabled:hover:bg-emerald-400"
              >
                {isTimerActive ? 'Code active' : showExpiredMessage ? 'Generate new code' : 'Get discount'}
              </button>
              <button
                type="button"
                onClick={() => {
                  document
                    .querySelector('[data-about-section]')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="w-full inline-flex items-center justify-center rounded-2xl border border-neutral-300 bg-white text-sm font-medium text-neutral-800 px-4 py-2 hover:bg-neutral-50 active:scale-[0.98] transition"
              >
                About
              </button>
            </div>

            {discountCode && (
              <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-4 text-center">
                <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
                  Your code
                </p>
                <p className="text-4xl font-bold tracking-[0.5em] text-slate-900">
                  {discountCode}
                </p>
                <div className="flex justify-center">
                  <QRCode value={discountCode} size={160} />
                </div>
                {(isTimerActive && remainingSeconds !== null) || showExpiredMessage ? (
                  <div className="flex justify-center">
                    {isTimerActive && remainingSeconds !== null && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                        {formatCountdown(remainingSeconds)}
                      </span>
                    )}
                    {showExpiredMessage && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
                        Code expired
                      </span>
                    )}
                  </div>
                ) : null}
                <p className="text-xs text-slate-500">
                  Show this code at the counter.
                </p>
                {isTimerActive && (
                  <button
                    type="button"
                    onClick={() => setFullScreen(true)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-600"
                  >
                    Open full screen
                  </button>
                )}
              </div>
            )}
          </div>
          <div
            data-about-section
            className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-xl shadow-emerald-900/5"
          >
            <p className="text-sm font-semibold text-slate-500">About</p>
            {venue.name === 'Chi Burdlaz Garden' && (
              <a
                href="https://www.chiburdlazgarden.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 hover:border-slate-400"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
                Official Website
              </a>
            )}
            <div className="mt-3 space-y-3 text-base text-slate-700">
              {venue.discountText && (
                <p>{venue.discountText}</p>
              )}
              {detailsWithoutAddress && (
                <p>{detailsWithoutAddress}</p>
              )}
              {venue.phone && (
                <p className="text-slate-700">
                  Phone:{' '}
                  <a
                    href={`tel:${venue.phone.replace(/\s/g, '')}`}
                    className="text-emerald-400 underline"
                  >
                    {venue.phone}
                  </a>
                </p>
              )}
              {openingRange && isOpen !== null && (
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isOpen
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isOpen ? 'Open now' : 'Closed'}
                  </span>
                  <span className="text-sm text-slate-600">
                    {isOpen
                      ? `Closes at ${formatTimeLabel(openingRange, 'close')}`
                      : `Opens at ${formatTimeLabel(openingRange, 'open')}`}
                  </span>
                </div>
              )}
              {(venue.openingHoursShort || venue.openingHours) && (
                <p className="text-slate-600">
                  {venue.openingHoursShort || venue.openingHours}
                </p>
              )}
            </div>
            <PartnerLocationCard partner={partnerLocationData} />
          </div>
        </div>
      </section>
      {fullScreen && discountCode && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 px-6 text-white">
          <button
            type="button"
            className="absolute right-6 top-6 text-sm font-semibold text-white/70"
            onClick={() => setFullScreen(false)}
          >
            Close ✕
          </button>
          <p className="text-sm uppercase tracking-[0.4em] text-emerald-200">
            <BrandLogo /> discount
          </p>
          <p className="mt-2 text-5xl font-bold tracking-[0.4em]">{discountCode}</p>
          <div className="mt-6 rounded-3xl bg-white p-6">
            <QRCode value={discountCode} size={220} />
          </div>
          {(isTimerActive && remainingSeconds !== null) || showExpiredMessage ? (
            <div className="mt-4 flex justify-center">
              {isTimerActive && remainingSeconds !== null && (
                <span className="inline-flex items-center rounded-full bg-amber-500/20 px-3 py-1 text-sm font-semibold text-amber-200">
                  {formatCountdown(remainingSeconds)}
                </span>
              )}
              {showExpiredMessage && (
                <span className="inline-flex items-center rounded-full bg-red-500/20 px-3 py-1 text-sm font-semibold text-red-200">
                  Code expired
                </span>
              )}
            </div>
          ) : null}
          <p className="mt-4 text-center text-sm text-emerald-100">
            {isTimerActive
              ? `Show this to the barista. Valid for ${formatCountdown(remainingSeconds ?? 0)}.`
              : 'Show this to the barista. Valid for 30 minutes.'}
          </p>
        </div>
      )}
    </>
  );
}

// Force dynamic rendering to ensure coordinates are always fresh from database
export const dynamic = 'force-dynamic';

export const getServerSideProps: GetServerSideProps<VenuePageProps> = async ({
  params,
}) => {
  const id = Number(params?.id);
  if (Number.isNaN(id)) {
    return { notFound: true };
  }

  const venue = await prisma.venue.findUnique({
    where: { id },
  });

  if (!venue || !venue.isActive) {
    return { notFound: true };
  }

  const payload: VenueDetails = {
    id: venue.id,
    name: venue.name,
    city: venue.city,
    category: venue.category,
    discountText: venue.discountText,
    isActive: venue.isActive,
    details: venue.details,
    openingHours: venue.openingHours,
    openingHoursShort: venue.openingHoursShort,
    mapUrl: venue.mapUrl, // Kept for type compatibility but not used in rendering
    phone: null,
    imageUrl: venue.imageUrl,
    thumbnailUrl: venue.thumbnailUrl,
    latitude: venue.latitude,
    longitude: venue.longitude,
  };

  return {
    props: {
      venue: payload,
    },
  };
};

