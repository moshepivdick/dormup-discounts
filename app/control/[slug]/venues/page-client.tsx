'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayoutApp';

type VenueDetails = {
  id: number;
  name: string;
  city: string;
  category: string;
  discountText: string;
  isActive: boolean;
  details?: string | null;
  openingHours?: string | null;
  mapUrl?: string | null;
};

type AdminVenuesPageProps = {
  slug: string;
};

export function AdminVenuesPageClient({ slug }: AdminVenuesPageProps) {
  const [venues, setVenues] = useState<VenueDetails[]>([]);

  useEffect(() => {
    // Load venues
    fetch('/api/admin/venues')
      .then((res) => {
        if (!res.ok) {
          console.error('Failed to fetch venues:', res.status, res.statusText);
          return { success: false, data: { venues: [] } };
        }
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setVenues(data.data.venues || []);
        } else {
          console.error('Venues API error:', data.message);
          setVenues([]);
        }
      })
      .catch((err) => {
        console.error('Error loading venues:', err);
        setVenues([]);
      });
  }, []);

  return (
    <AdminLayout slug={slug}>
      <div className="space-y-8 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Venues</h2>
          <Link
            href={`/control/${slug}/places/new`}
            className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            + Add place
          </Link>
        </div>
        <div className="space-y-3 rounded-2xl border border-white/10 p-4">
          {venues.map((venue) => (
            <div key={venue.id} className="rounded-xl bg-white/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-semibold">{venue.name}</p>
                <Link
                  href={`/control/${slug}/places/${venue.id}`}
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300 hover:text-emerald-200"
                >
                  Edit
                </Link>
              </div>
              <p className="text-sm text-white/70">
                {venue.city} · {venue.category}
              </p>
              <p className="text-xs text-white/60">{venue.discountText}</p>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

