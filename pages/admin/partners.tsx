import { useState, type ReactNode } from 'react';
import type { GetServerSideProps } from 'next';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/guards';

type AdminPartnersProps = {
  partners: {
    id: string;
    email: string;
    venueName: string;
  }[];
  venues: { id: number; name: string }[];
};

export default function AdminPartnersPage({ partners, venues }: AdminPartnersProps) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    venueId: venues[0]?.id ?? 0,
  });
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [message, setMessage] = useState('');

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
    setStatus('idle');
  };

  return (
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
  );
}

AdminPartnersPage.getLayout = (page: ReactNode) => <AdminLayout>{page}</AdminLayout>;

export const getServerSideProps = (async (ctx) => {
  const guard = await requireAdmin(ctx);
  if ('redirect' in guard) {
    return guard;
  }

  const [partners, venues] = await Promise.all([
    prisma.partner.findMany({
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            city: true,
            category: true,
            discountText: true,
            details: true,
            openingHours: true,
            openingHoursShort: true,
            mapUrl: true,
            latitude: true,
            longitude: true,
            imageUrl: true,
            thumbnailUrl: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            phone: true,
            // Explicitly exclude avgStudentBill to avoid P2022 error if column doesn't exist
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.venue.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        category: true,
        discountText: true,
        details: true,
        openingHours: true,
        openingHoursShort: true,
        mapUrl: true,
        latitude: true,
        longitude: true,
        imageUrl: true,
        thumbnailUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        phone: true,
        // Explicitly exclude avgStudentBill
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  return {
    props: {
      partners: partners.map((partner) => ({
        id: partner.id,
        email: partner.email,
        venueName: partner.venue?.name ?? 'Unassigned',
      })),
      venues: venues.map((venue) => ({ id: venue.id, name: venue.name })),
    },
  };
}) as GetServerSideProps<AdminPartnersProps>;

