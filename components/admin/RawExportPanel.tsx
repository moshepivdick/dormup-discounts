'use client';

import { useState } from 'react';

type Partner = {
  id: string;
  email: string;
  venueId: number;
  venue: {
    name: string;
  };
};

type Props = {
  partners: Partner[];
};

const EVENT_TYPES = [
  { value: 'PAGE_VIEW', label: 'Page Views' },
  { value: 'QR_GENERATED', label: 'QR Generated' },
  { value: 'QR_REDEEMED', label: 'QR Redeemed' },
];

export function RawExportPanel({ partners }: Props) {
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });

  const [toDate, setToDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });

  const [selectedPartner, setSelectedPartner] = useState<string>('all');
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>(['PAGE_VIEW', 'QR_GENERATED', 'QR_REDEEMED']);
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickPreset = (preset: 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(firstDay.toISOString().split('T')[0]);
      setToDate(now.toISOString().split('T')[0]);
    } else {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setFromDate(firstDayLastMonth.toISOString().split('T')[0]);
      setToDate(lastDayLastMonth.toISOString().split('T')[0]);
    }
  };

  const handleEventTypeToggle = (eventType: string) => {
    setSelectedEventTypes((prev) =>
      prev.includes(eventType)
        ? prev.filter((t) => t !== eventType)
        : [...prev, eventType]
    );
  };

  const handleExport = async () => {
    if (!fromDate || !toDate) {
      setError('Please select date range');
      return;
    }

    if (selectedEventTypes.length === 0) {
      setError('Please select at least one event type');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        format,
        from: fromDate,
        to: toDate,
        types: selectedEventTypes.join(','),
        tz: 'Europe/Rome',
      });

      if (selectedPartner !== 'all') {
        params.append('partnerId', selectedPartner);
      }

      const url = `/api/admin/exports/events?${params.toString()}`;

      // Fetch with error handling
      const response = await fetch(url);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `Export failed: ${response.statusText}`);
      }

      // Get blob and trigger download
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `dormup-events-${fromDate.replace(/-/g, '')}-${toDate.replace(/-/g, '')}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to export events');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Date Range */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-slate-700 px-4 py-2 text-white"
            disabled={loading}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-slate-700 px-4 py-2 text-white"
            disabled={loading}
          />
        </div>
      </div>

      {/* Quick Presets */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Quick Presets</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleQuickPreset('thisMonth')}
            disabled={loading}
            className="rounded-lg border border-white/20 bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50"
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset('lastMonth')}
            disabled={loading}
            className="rounded-lg border border-white/20 bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50"
          >
            Last Month
          </button>
        </div>
      </div>

      {/* Partner Selector */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Partner</label>
        <select
          value={selectedPartner}
          onChange={(e) => setSelectedPartner(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-slate-700 px-4 py-2 text-white"
          disabled={loading}
        >
          <option value="all">All Partners</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.venue.name} ({p.email})
            </option>
          ))}
        </select>
      </div>

      {/* Event Type Multi-Select */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Event Types</label>
        <div className="flex flex-wrap gap-3">
          {EVENT_TYPES.map((type) => (
            <label
              key={type.value}
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-slate-700 px-4 py-2 cursor-pointer hover:bg-slate-600"
            >
              <input
                type="checkbox"
                checked={selectedEventTypes.includes(type.value)}
                onChange={() => handleEventTypeToggle(type.value)}
                disabled={loading}
                className="rounded border-white/20 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-white">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Format Selector */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Format</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="format"
              value="csv"
              checked={format === 'csv'}
              onChange={(e) => setFormat(e.target.value as 'csv' | 'xlsx')}
              disabled={loading}
              className="text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-white">CSV</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="format"
              value="xlsx"
              checked={format === 'xlsx'}
              onChange={(e) => setFormat(e.target.value as 'csv' | 'xlsx')}
              disabled={loading}
              className="text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-white">XLSX</span>
          </label>
        </div>
        {format === 'xlsx' && (
          <p className="mt-2 text-xs text-slate-400">
            Note: XLSX exports are limited to 10,000 rows. Use CSV for larger datasets.
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={loading || selectedEventTypes.length === 0}
        className="w-full rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Exporting...' : 'Export Raw Data'}
      </button>
    </div>
  );
}
