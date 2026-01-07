'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayoutApp';

type Partner = {
  id: string;
  email: string;
  venueName: string;
};

type Venue = {
  id: number;
  name: string;
};

type AdminPartnersPageProps = {
  slug: string;
};

export function AdminPartnersPageClient({ slug }: AdminPartnersPageProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [form, setForm] = useState({
    email: '',
    password: '',
    venueId: 0,
  });
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Load partners and venues
    Promise.all([
      fetch('/api/admin/partners').then((res) => res.json()),
      fetch('/api/admin/venues').then((res) => res.json()),
    ]).then(([partnersData, venuesData]) => {
      if (partnersData.success) {
        setPartners(partnersData.data.partners || []);
      }
      if (venuesData.success) {
        const venuesList = venuesData.data.venues || [];
        setVenues(venuesList);
        if (venuesList.length > 0) {
          setForm((prev) => ({ ...prev, venueId: venuesList[0].id }));
        }
      }
    }).catch((err) => {
      console.error('Error loading data:', err);
    });
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('saving');
    const response = await fetch('/api/admin/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const payload = await response.json();
    setMessage(payload.success ? 'Partner saved' : payload.message ?? 'Error');
    if (payload.success) {
      setForm((prev) => ({ ...prev, email: '', password: '' }));
      // Reload partners
      const reloadResponse = await fetch('/api/admin/partners');
      const reloadData = await reloadResponse.json();
      if (reloadData.success) {
        setPartners(reloadData.data.partners || []);
      }
    }
    setStatus('idle');
  };

  return (
    <AdminLayout slug={slug}>
      <div className="space-y-8 text-white">
        <h2 className="text-xl font-semibold">Partners</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 p-4">
            <label className="block text-sm font-medium text-white/70">
              Email
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>
            <label className="block text-sm font-medium text-white/70">
              Password
              <input
                type="password"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </label>
            <label className="block text-sm font-medium text-white/70">
              Venue
              <select
                className="mt-2 w-full rounded-2xl border border-gray-700 bg-gray-900 px-4 py-2 text-gray-100"
                value={form.venueId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, venueId: Number(event.target.value) }))
                }
              >
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id} className="bg-gray-900 text-gray-100">
                    {venue.name}
                  </option>
                ))}
              </select>
            </label>
            {message && <p className="text-sm text-emerald-300">{message}</p>}
            <button
              type="submit"
              disabled={status === 'saving'}
              className="w-full rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold"
            >
              {status === 'saving' ? 'Saving…' : 'Save partner'}
            </button>
          </form>
          <div className="space-y-3 rounded-2xl border border-white/10 p-4">
            {partners.map((partner) => (
              <div key={partner.id} className="rounded-xl bg-white/5 p-3">
                <p className="text-lg font-semibold">{partner.email}</p>
                <p className="text-sm text-white/70">{partner.venueName}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

