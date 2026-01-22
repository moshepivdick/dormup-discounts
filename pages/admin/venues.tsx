import { useState, type ReactNode } from 'react';
import type { GetServerSideProps } from 'next';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/guards';
import type { VenueDetails } from '@/types';
import { VENUE_CATEGORY_VALUES, VENUE_CATEGORY_LABELS, mapLegacyCategory, isValidCategory } from '@/lib/constants/categories';

type AdminVenuesProps = {
  venues: VenueDetails[];
  upgradeRequestsByVenue: Record<number, UpgradeRequestInfo[]>;
};

type UpgradeRequestInfo = {
  id: string;
  venueId: number;
  partnerId: string;
  fromTier: 'BASIC' | 'PRO' | 'MAX';
  toTier: 'BASIC' | 'PRO' | 'MAX';
  note: string | null;
  createdAt: string;
};

export default function AdminVenuesPage({ venues, upgradeRequestsByVenue }: AdminVenuesProps) {
  const [form, setForm] = useState({
    name: '',
    city: '',
    category: '',
    discountText: '',
    priceLevel: '' as '' | 'budget' | 'mid' | 'premium',
    typicalStudentSpendMin: '',
    typicalStudentSpendMax: '',
  });
  const [editingVenue, setEditingVenue] = useState<VenueDetails | null>(null);
  const [editForm, setEditForm] = useState({
    priceLevel: '' as '' | 'budget' | 'mid' | 'premium',
    typicalStudentSpendMin: '',
    typicalStudentSpendMax: '',
  });
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [editStatus, setEditStatus] = useState<'idle' | 'saving'>('idle');
  const [message, setMessage] = useState('');
  const [tierUpdatingId, setTierUpdatingId] = useState<number | null>(null);

  const tierOrder: Array<'BASIC' | 'PRO' | 'MAX'> = ['BASIC', 'PRO', 'MAX'];

  const getNextTier = (current?: 'BASIC' | 'PRO' | 'MAX') => {
    const index = tierOrder.indexOf(current || 'BASIC');
    return tierOrder[(index + 1) % tierOrder.length];
  };

  const handleTierUpdate = async (venueId: number, subscriptionTier: 'BASIC' | 'PRO' | 'MAX', requestId?: string) => {
    setTierUpdatingId(venueId);
    const response = await fetch(`/api/admin/venues/${venueId}/subscription`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionTier, requestId }),
    });
    const result = await response.json();
    if (!result.success) {
      setMessage(result.message ?? 'Failed to update tier');
    } else {
      window.location.reload();
    }
    setTierUpdatingId(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('saving');
    const payload: any = {
      name: form.name,
      city: form.city,
      category: form.category,
      discountText: form.discountText,
      latitude: 0, // Required by schema, but should be set properly
      longitude: 0, // Required by schema, but should be set properly
    };
    if (form.priceLevel) {
      payload.priceLevel = form.priceLevel;
    }
    if (form.typicalStudentSpendMin) {
      payload.typicalStudentSpendMin = parseInt(form.typicalStudentSpendMin, 10);
    }
    if (form.typicalStudentSpendMax) {
      payload.typicalStudentSpendMax = parseInt(form.typicalStudentSpendMax, 10);
    }
    const response = await fetch('/api/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (result.success) {
      setMessage('Venue created');
      setForm({ name: '', city: '', category: '', discountText: '', priceLevel: '', typicalStudentSpendMin: '', typicalStudentSpendMax: '' });
      window.location.reload();
    } else {
      setMessage(result.message ?? 'Error');
    }
    setStatus('idle');
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingVenue) return;
    setEditStatus('saving');
    const payload: any = {};
    if (editForm.priceLevel) {
      payload.priceLevel = editForm.priceLevel;
    } else {
      payload.priceLevel = null;
    }
    if (editForm.typicalStudentSpendMin) {
      payload.typicalStudentSpendMin = parseInt(editForm.typicalStudentSpendMin, 10);
    } else {
      payload.typicalStudentSpendMin = null;
    }
    if (editForm.typicalStudentSpendMax) {
      payload.typicalStudentSpendMax = parseInt(editForm.typicalStudentSpendMax, 10);
    } else {
      payload.typicalStudentSpendMax = null;
    }
    const response = await fetch(`/api/admin/venues/${editingVenue.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (result.success) {
      setMessage('Venue updated');
      setEditingVenue(null);
      window.location.reload();
    } else {
      setMessage(result.message ?? 'Error');
    }
    setEditStatus('idle');
  };

  const startEdit = (venue: VenueDetails) => {
    setEditingVenue(venue);
    setEditForm({
      priceLevel: venue.priceLevel || '',
      typicalStudentSpendMin: venue.typicalStudentSpendMin?.toString() || '',
      typicalStudentSpendMax: venue.typicalStudentSpendMax?.toString() || '',
    });
  };

  return (
    <div className="space-y-8 text-white">
      <h2 className="text-xl font-semibold">Venues</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 p-4">
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">Add venue</p>
          {['name', 'city', 'discountText'].map((field) => (
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
          <label className="block text-sm font-medium text-white/70">
            Category
            <select
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              required
            >
              <option value="">Select category</option>
              {VENUE_CATEGORY_VALUES.map((cat) => (
                <option key={cat} value={cat}>
                  {VENUE_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-white/70">
            Price level
            <select
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white"
              value={form.priceLevel}
              onChange={(e) => setForm((prev) => ({ ...prev, priceLevel: e.target.value as any }))}
            >
              <option value="">Select price level</option>
              <option value="budget">Budget (€)</option>
              <option value="mid">Mid-range (€€)</option>
              <option value="premium">Premium (€€€)</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-white/70">
              Typical student spend min
              <input
                type="number"
                min="0"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                value={form.typicalStudentSpendMin}
                onChange={(e) => setForm((prev) => ({ ...prev, typicalStudentSpendMin: e.target.value }))}
              />
            </label>
            <label className="block text-sm font-medium text-white/70">
              Typical student spend max
              <input
                type="number"
                min="0"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                value={form.typicalStudentSpendMax}
                onChange={(e) => setForm((prev) => ({ ...prev, typicalStudentSpendMax: e.target.value }))}
              />
            </label>
          </div>
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
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/70">
                <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 font-semibold">
                  {venue.subscriptionTier || 'BASIC'}
                </span>
                <button
                  onClick={() => handleTierUpdate(venue.id, getNextTier(venue.subscriptionTier as any))}
                  disabled={tierUpdatingId === venue.id}
                  className="rounded-full border border-white/10 px-2 py-0.5 text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {tierUpdatingId === venue.id ? 'Updating…' : 'Cycle tier'}
                </button>
              </div>
              {upgradeRequestsByVenue[venue.id]?.length ? (
                <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-white/5 p-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">
                    Pending upgrade requests
                  </p>
                  {upgradeRequestsByVenue[venue.id].map((request) => (
                    <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/70">
                      <div>
                        <p className="font-medium">
                          {request.fromTier} → {request.toTier}
                        </p>
                        {request.note ? (
                          <p className="text-[11px] text-white/50">Note: {request.note}</p>
                        ) : null}
                      </div>
                      <button
                        onClick={() => handleTierUpdate(venue.id, request.toTier, request.id)}
                        disabled={tierUpdatingId === venue.id}
                        className="rounded-full border border-emerald-400/30 px-2 py-0.5 text-emerald-200 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Approve
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 flex items-center gap-2 text-xs text-white/50">
                {venue.priceLevel && (
                  <span>
                    Price: {venue.priceLevel === 'budget' && '€'}
                    {venue.priceLevel === 'mid' && '€€'}
                    {venue.priceLevel === 'premium' && '€€€'}
                  </span>
                )}
                {venue.typicalStudentSpendMin != null && venue.typicalStudentSpendMax != null && (
                  <span>
                    Spend: €{venue.typicalStudentSpendMin}–{venue.typicalStudentSpendMax}
                  </span>
                )}
              </div>
              <button
                onClick={() => startEdit(venue)}
                className="mt-2 rounded-lg bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20"
              >
                Edit price
              </button>
            </div>
          ))}
        </div>
        {editingVenue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <form
              onSubmit={handleEditSubmit}
              className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6"
            >
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-white">Edit price: {editingVenue.name}</p>
                <button
                  type="button"
                  onClick={() => setEditingVenue(null)}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <label className="block text-sm font-medium text-white/70">
                Price level
                <select
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                  value={editForm.priceLevel}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, priceLevel: e.target.value as any }))}
                >
                  <option value="">None</option>
                  <option value="budget">Budget (€)</option>
                  <option value="mid">Mid-range (€€)</option>
                  <option value="premium">Premium (€€€)</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-white/70">
                  Typical student spend min
                  <input
                    type="number"
                    min="0"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                    value={editForm.typicalStudentSpendMin}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, typicalStudentSpendMin: e.target.value }))}
                  />
                </label>
                <label className="block text-sm font-medium text-white/70">
                  Typical student spend max
                  <input
                    type="number"
                    min="0"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                    value={editForm.typicalStudentSpendMax}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, typicalStudentSpendMax: e.target.value }))}
                  />
                </label>
              </div>
              {message && <p className="text-sm text-emerald-300">{message}</p>}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={editStatus === 'saving'}
                  className="flex-1 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  {editStatus === 'saving' ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingVenue(null)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
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
    let upgradeRequests = [];
    try {
      upgradeRequests = await prisma.upgradeRequest.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      if (error?.code !== 'P2021') {
        throw error;
      }
    }

    return {
      props: {
        venues: venues.map((venue) => {
          // Normalize category to canonical value
          const category = isValidCategory(venue.category) ? venue.category : mapLegacyCategory(venue.category);
          return {
            id: venue.id,
            name: venue.name,
            city: venue.city,
            category,
            discountText: venue.discountText,
            isActive: venue.isActive,
            details: venue.details,
            openingHours: venue.openingHours,
            mapUrl: venue.mapUrl,
            priceLevel: venue.priceLevel,
            typicalStudentSpendMin: venue.typicalStudentSpendMin,
            typicalStudentSpendMax: venue.typicalStudentSpendMax,
            subscriptionTier: venue.subscriptionTier,
          };
        }),
        upgradeRequestsByVenue: upgradeRequests.reduce<Record<number, UpgradeRequestInfo[]>>(
          (acc, request) => {
            if (!acc[request.venueId]) {
              acc[request.venueId] = [];
            }
            acc[request.venueId].push({
              id: request.id,
              venueId: request.venueId,
              partnerId: request.partnerId,
              fromTier: request.fromTier,
              toTier: request.toTier,
              note: request.note,
              createdAt: request.createdAt.toISOString(),
            });
            return acc;
          },
          {},
        ),
      },
    };
  } catch (error) {
    console.error('Error loading venues:', error);
    return {
      props: {
        venues: [],
        upgradeRequestsByVenue: {},
      },
    };
  }
}) as GetServerSideProps<AdminVenuesProps>;

