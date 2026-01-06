'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDistance } from '@/utils/distance';
import {
  parseOpeningRangeFromShort,
  isOpenNow,
  formatTimeLabel,
} from '@/utils/opening';
import type { VenueSummary } from '@/types';

type Props = {
  venue: VenueSummary;
};

export function VenueCard({ venue }: Props) {
  const imageSrc = venue.thumbnailUrl ?? venue.imageUrl;
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [openingRange, setOpeningRange] = useState<ReturnType<typeof parseOpeningRangeFromShort> | null>(null);

  // Compute opening status on client side
  useEffect(() => {
    const range = parseOpeningRangeFromShort(venue.openingHoursShort);
    setOpeningRange(range);
    if (range) {
      setIsOpen(isOpenNow(range));
    }
  }, [venue.openingHoursShort]);

  // Track venue card click/view
  const handleClick = () => {
    // Track click asynchronously (don't block navigation)
    fetch('/api/analytics/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venueId: venue.id, city: venue.city }),
    }).catch(() => null);
  };

  return (
    <Link
      id={`venue-${venue.id}`}
      href={`/venues/${venue.id}`}
      onClick={handleClick}
      className="flex flex-col gap-1.5 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-4 md:gap-4 md:rounded-3xl"
    >
      {imageSrc && (
        <div className="mb-2 overflow-hidden rounded-xl bg-slate-100">
          <Image
            src={imageSrc}
            alt={`${venue.name} venue`}
            width={800}
            height={400}
            className="h-28 w-full object-cover sm:h-32 md:h-40"
          />
        </div>
      )}
      <div className="flex items-start justify-between gap-2 md:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 md:text-xs md:tracking-[0.3em]">
            {venue.city}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 md:mt-1 md:gap-2">
            <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900 md:line-clamp-none md:text-2xl">
              {venue.name}
            </h3>
            {openingRange && isOpen !== null && (
              <span
                className={`hidden shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold md:inline-flex ${
                  isOpen
                    ? 'border-emerald-200 text-emerald-700'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                {isOpen ? 'Open now' : 'Closed now'}
              </span>
            )}
          </div>
          {venue.discountText && (
            <div className="mt-1 flex items-start gap-1.5 md:mt-2">
              <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-semibold text-emerald-700 md:h-5 md:w-5 md:text-[11px]">
                %
              </span>
              <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-slate-900 md:text-sm">
                {venue.discountText}
              </p>
            </div>
          )}
          <p className="text-[11px] text-slate-500 md:text-sm">{venue.category}</p>
          {venue.distance != null && (
            <p className="hidden text-xs text-neutral-500 md:block">
              {formatDistance(venue.distance)}
            </p>
          )}
        </div>
        <span
          className={`hidden rounded-full px-3 py-1 text-xs font-semibold md:inline-flex ${
            venue.isActive
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {venue.isActive ? 'Active' : 'Paused'}
        </span>
      </div>
      {venue.openingHoursShort && (
        <p className="hidden text-xs text-slate-500 md:block">
          {venue.openingHoursShort}
        </p>
      )}
      <span className="hidden mt-5 inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 md:inline-flex">
        View details
      </span>
    </Link>
  );
}

