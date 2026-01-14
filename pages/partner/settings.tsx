import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { auth } from '@/lib/auth';
import Link from 'next/link';

type PartnerSettingsProps = {
  partner: {
    email: string;
    venueName: string;
    venueId: number;
  };
};

type VenueData = {
  id: number;
  name: string;
  city: string;
  category: string;
  discountText: string;
  details: string | null;
  openingHours: string | null;
  openingHoursShort: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  mapUrl: string | null;
  priceLevel: 'budget' | 'mid' | 'premium' | null;
  typicalStudentSpendMin: number | null;
  typicalStudentSpendMax: number | null;
  avgStudentBill: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function PartnerSettingsPage({ partner }: PartnerSettingsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    discountText: '',
    details: '',
    openingHours: '',
    openingHoursShort: '',
    phone: '',
    address: '', // Temporary field for geocoding
    latitude: 0,
    longitude: 0,
    priceLevel: '' as '' | 'budget' | 'mid' | 'premium',
    typicalStudentSpendMin: '',
    typicalStudentSpendMax: '',
    avgStudentBill: '',
    imageUrl: '',
    thumbnailUrl: '',
    mapUrl: '',
  });

  useEffect(() => {
    const fetchVenueData = async () => {
      try {
        const response = await fetch('/api/partner/venue-settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.venue) {
            const venue = data.data.venue as VenueData;
            setFormData({
              name: venue.name || '',
              discountText: venue.discountText || '',
              details: venue.details || '',
              openingHours: venue.openingHours || '',
              openingHoursShort: venue.openingHoursShort || '',
              phone: venue.phone || '',
              address: '', // We don't store address, only coordinates
              latitude: venue.latitude || 0,
              longitude: venue.longitude || 0,
              priceLevel: venue.priceLevel || '',
              typicalStudentSpendMin: venue.typicalStudentSpendMin?.toString() || '',
              typicalStudentSpendMax: venue.typicalStudentSpendMax?.toString() || '',
              avgStudentBill: venue.avgStudentBill?.toString() || '',
              imageUrl: venue.imageUrl || '',
              thumbnailUrl: venue.thumbnailUrl || '',
              mapUrl: venue.mapUrl || '',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching venue data:', error);
        setMessage({ type: 'error', text: 'Failed to load venue data' });
      } finally {
        setLoading(false);
      }
    };

    fetchVenueData();
  }, []);

  const handleGeocode = async () => {
    if (!formData.address.trim()) {
      setMessage({ type: 'error', text: 'Please enter an address' });
      return;
    }

    setGeocoding(true);
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: formData.address }),
      });

      const result = await response.json();

      if (result.success) {
        setFormData(prev => ({
          ...prev,
          latitude: result.lat,
          longitude: result.lng,
        }));
        setMessage({ 
          type: 'success', 
          text: `Coordinates updated: ${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}${result.formattedAddress ? ` (${result.formattedAddress})` : ''}` 
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to geocode address' });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setMessage({ type: 'error', text: 'Failed to geocode address. Please check your internet connection.' });
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload: any = {};

      // Only include fields that have been changed
      if (formData.name) payload.name = formData.name;
      if (formData.discountText) payload.discountText = formData.discountText;
      if (formData.details !== undefined) payload.details = formData.details || null;
      if (formData.openingHours !== undefined) payload.openingHours = formData.openingHours || null;
      if (formData.openingHoursShort !== undefined) payload.openingHoursShort = formData.openingHoursShort || null;
      if (formData.phone !== undefined) payload.phone = formData.phone || null;
      if (formData.latitude !== 0) payload.latitude = formData.latitude;
      if (formData.longitude !== 0) payload.longitude = formData.longitude;
      if (formData.priceLevel) payload.priceLevel = formData.priceLevel;
      else if (formData.priceLevel === '') payload.priceLevel = null;
      if (formData.typicalStudentSpendMin) payload.typicalStudentSpendMin = parseInt(formData.typicalStudentSpendMin, 10);
      else if (formData.typicalStudentSpendMin === '') payload.typicalStudentSpendMin = null;
      if (formData.typicalStudentSpendMax) payload.typicalStudentSpendMax = parseInt(formData.typicalStudentSpendMax, 10);
      else if (formData.typicalStudentSpendMax === '') payload.typicalStudentSpendMax = null;
      if (formData.avgStudentBill) payload.avgStudentBill = parseFloat(formData.avgStudentBill);
      else if (formData.avgStudentBill === '') payload.avgStudentBill = null;
      if (formData.imageUrl !== undefined) payload.imageUrl = formData.imageUrl || null;
      if (formData.thumbnailUrl !== undefined) payload.thumbnailUrl = formData.thumbnailUrl || null;
      if (formData.mapUrl !== undefined) payload.mapUrl = formData.mapUrl || null;

      const response = await fetch('/api/partner/venue-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: result.data?.message || 'Venue updated successfully' });
        // Reload venue data to get updated values
        setTimeout(() => {
          router.reload();
        }, 1000);
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to update venue' });
      }
    } catch (error) {
      console.error('Error updating venue:', error);
      setMessage({ type: 'error', text: 'Failed to update venue. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/partner/logout', { method: 'POST' });
    router.push('/partner/login');
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Venue Settings | DormUp Discounts</title>
        </Head>
        <main className="flex min-h-screen items-center justify-center bg-slate-100">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto"></div>
            <p className="text-slate-600">Loading venue data...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Venue Settings | DormUp Discounts</title>
      </Head>
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Venue Settings</h1>
              <p className="mt-1 text-sm text-slate-600">{partner.venueName}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/partner"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Back
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
              >
                Log out
              </button>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 rounded-2xl p-4 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-rose-50 text-rose-800'
              }`}
            >
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Venue Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                    placeholder="e.g., Moka Brew Lab"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Discount Description *
                  </label>
                  <textarea
                    required
                    value={formData.discountText}
                    onChange={(e) => setFormData({ ...formData, discountText: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                    placeholder="e.g., 15% off on all drinks for students"
                  />
                  <p className="mt-1 text-xs text-slate-500">This is what students will see when they view your venue</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Details
                  </label>
                  <textarea
                    value={formData.details || ''}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                    placeholder="Additional information about your venue..."
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Contact & Location</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                    placeholder="+39 0541 123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Address (for geocoding)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                      placeholder="Via Roma, 10, 47921 Rimini RN"
                    />
                    <button
                      type="button"
                      onClick={handleGeocode}
                      disabled={geocoding || !formData.address.trim()}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {geocoding ? 'Geocoding...' : 'Get Coordinates'}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Current coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude || ''}
                      onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude || ''}
                      onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Hours & Pricing</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Opening Hours (Full)
                  </label>
                  <textarea
                    value={formData.openingHours || ''}
                    onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                    placeholder="Mon-Fri: 8:00-20:00&#10;Sat-Sun: 9:00-22:00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Opening Hours (Short)
                  </label>
                  <input
                    type="text"
                    value={formData.openingHoursShort || ''}
                    onChange={(e) => setFormData({ ...formData, openingHoursShort: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                    placeholder="Mon-Fri 8-20, Sat-Sun 9-22"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Price Level
                  </label>
                  <select
                    value={formData.priceLevel}
                    onChange={(e) => setFormData({ ...formData, priceLevel: e.target.value as '' | 'budget' | 'mid' | 'premium' })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                  >
                    <option value="">Select price level</option>
                    <option value="budget">Budget</option>
                    <option value="mid">Mid-range</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Min Spend (€)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.typicalStudentSpendMin}
                      onChange={(e) => setFormData({ ...formData, typicalStudentSpendMin: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Max Spend (€)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.typicalStudentSpendMax}
                      onChange={(e) => setFormData({ ...formData, typicalStudentSpendMax: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                      placeholder="20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Avg Bill (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.avgStudentBill}
                      onChange={(e) => setFormData({ ...formData, avgStudentBill: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                      placeholder="15.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Images & Links</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Main Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl || ''}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="mt-1 text-xs text-slate-500">Full URL to the main venue image</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Thumbnail Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.thumbnailUrl || ''}
                    onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                    placeholder="https://example.com/thumbnail.jpg"
                  />
                  <p className="mt-1 text-xs text-slate-500">Full URL to the thumbnail image</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Map URL
                  </label>
                  <input
                    type="url"
                    value={formData.mapUrl || ''}
                    onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                    placeholder="https://maps.google.com/..."
                  />
                  <p className="mt-1 text-xs text-slate-500">Link to Google Maps or other map service</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Link
                href="/partner"
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PartnerSettingsProps> = async ({ req }) => {
  const partner = await auth.getPartnerFromRequest(req);

  if (!partner || !partner.venue) {
    return {
      redirect: {
        destination: '/partner/login',
        permanent: false,
      },
    };
  }

  return {
    props: {
      partner: {
        email: partner.email,
        venueName: partner.venue.name,
        venueId: partner.venueId,
      },
    },
  };
};
