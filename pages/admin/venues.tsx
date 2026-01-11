import { useState, type ReactNode } from 'react';
import type { GetServerSideProps } from 'next';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/guards';
import type { VenueDetails } from '@/types';

type AdminVenuesProps = {
  venues: VenueDetails[];
};

export default function AdminVenuesPage({ venues }: AdminVenuesProps) {
  const [form, setForm] = useState({
    name: '',
    city: '',
    category: '',
    discountText: '',
  });
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('saving');
    const response = await fetch('/api/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const payload = await response.json();
    if (payload.success) {
      setMessage('Venue created');
      setForm({ name: '', city: '', category: '', discountText: '' });
    } else {
      setMessage(payload.message ?? 'Error');
    }
    setStatus('idle');
  };

  return (
    <div className="space-y-8 text-white">
      <h2 className="text-xl font-semibold">Venues</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 p-4">
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">Add venue</p>
          {['name', 'city', 'category', 'discountText'].map((field) => (
            <label key={field} className="block text-sm font-medium text-white/70">
              {field}
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                value={(form as Record<string, string>)[field]}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, [field]: event.target.value }))
                }
                required
              />
            </label>
          ))}
          {message && <p className="text-sm text-emerald-300">{message}</p>}
          <button
            type="submit"
            disabled={status === 'saving'}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
          >
            {status === 'saving' ? 'Saving…' : 'Save venue'}
          </button>
        </form>
        <div className="space-y-3 rounded-2xl border border-white/10 p-4">
          {venues.map((venue) => (
            <div key={venue.id} className="rounded-xl bg-white/5 p-3">
              <p className="text-lg font-semibold">{venue.name}</p>
              <p className="text-sm text-white/70">
                {venue.city} · {venue.category}
              </p>
              <p className="text-xs text-white/60">{venue.discountText}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

AdminVenuesPage.getLayout = (page: ReactNode) => <AdminLayout>{page}</AdminLayout>;

export const getServerSideProps = (async (ctx) => {
  const guard = await requireAdmin(ctx);
  if ('redirect' in guard) {
    return guard;
  }

  try {
    const venues = await prisma.venue.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return {
      props: {
        venues: venues.map((venue) => ({
          id: venue.id,
          name: venue.name,
          city: venue.city,
          category: venue.category,
          discountText: venue.discountText,
          isActive: venue.isActive,
          details: venue.details,
          openingHours: venue.openingHours,
          mapUrl: venue.mapUrl,
        })),
      },
    };
  } catch (error) {
    console.error('Error loading venues:', error);
    return {
      props: {
        venues: [],
      },
    };
  }
}) as GetServerSideProps<AdminVenuesProps>;

