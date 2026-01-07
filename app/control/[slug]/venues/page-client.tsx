'use client';

import { useState, useEffect } from 'react';
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
  const [form, setForm] = useState({
    name: '',
    city: '',
    category: '',
    discountText: '',
  });
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Load venues
    fetch('/api/admin/venues')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setVenues(data.data.venues || []);
        }
      })
      .catch((err) => {
        console.error('Error loading venues:', err);
      });
  }, []);

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
      // Reload venues
      const reloadResponse = await fetch('/api/admin/venues');
      const reloadData = await reloadResponse.json();
      if (reloadData.success) {
        setVenues(reloadData.data.venues || []);
      }
    } else {
      setMessage(payload.message ?? 'Error');
    }
    setStatus('idle');
  };

  return (
    <AdminLayout slug={slug}>
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
    </AdminLayout>
  );
}

