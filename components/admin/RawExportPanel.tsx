'use client';

import { useState, useEffect } from 'react';

type Partner = {
  id: string;
  email: string;
  venueId: number;
  venue: {
    name: string;
  };
};

type ExportJob = {
  id: string;
  created_at: string;
  completed_at: string | null;
  status: 'PENDING' | 'READY' | 'FAILED';
  format: 'csv' | 'xlsx';
  from_date: string;
  to_date: string;
  partner_id: string | null;
  event_types: string[];
  row_count: number | null;
  error_message: string | null;
  download_url: string | null;
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
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

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

  const loadJobs = async () => {
    try {
      const response = await fetch('/api/admin/exports/jobs');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setJobs(data.data || []);
          return data.data || [];
        }
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
    return [];
  };

  const startPolling = () => {
    // Stop any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    const startTime = Date.now();
    const interval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      
      // Stop after 60 seconds
      if (elapsed > 60000) {
        clearInterval(interval);
        setPollingInterval(null);
        return;
      }

      // Refresh jobs
      const updatedJobs = await loadJobs();

      // Check if there are still PENDING jobs
      const hasPending = updatedJobs.some((j: ExportJob) => j.status === 'PENDING');
      if (!hasPending) {
        clearInterval(interval);
        setPollingInterval(null);
      }
    }, 2000); // Poll every 2 seconds

    setPollingInterval(interval);
  };

  useEffect(() => {
    // Load jobs on mount
    loadJobs();

    // Cleanup polling on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const response = await fetch('/api/admin/exports/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          from: fromDate,
          to: toDate,
          partnerId: selectedPartner !== 'all' ? selectedPartner : undefined,
          types: selectedEventTypes,
          tz: 'Europe/Rome',
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Export failed: ${response.statusText}`);
      }

      // Refresh jobs and start polling
      await loadJobs();
      startPolling();
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to create export job');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (job: ExportJob) => {
    if (job.download_url) {
      window.open(job.download_url, '_blank');
    }
  };

  const handleRetry = async (job: ExportJob) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/exports/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: job.format,
          from: job.from_date,
          to: job.to_date,
          partnerId: job.partner_id || undefined,
          types: job.event_types,
          tz: 'Europe/Rome',
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to retry export');
      }

      await loadJobs();
      startPolling();
    } catch (err: any) {
      console.error('Retry error:', err);
      setError(err.message || 'Failed to retry export');
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
        {loading ? 'Creating Export...' : 'Create Raw Export'}
      </button>

      {/* Export Jobs List */}
      {jobs.length > 0 && (
        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-semibold text-slate-300">Export History</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-lg border border-white/10 bg-slate-700 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-white">
                        {new Date(job.from_date).toLocaleDateString()} - {new Date(job.to_date).toLocaleDateString()}
                      </span>
                      {job.status === 'PENDING' && (
                        <span className="flex items-center gap-2 rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-medium text-yellow-200">
                          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Generating...
                        </span>
                      )}
                      {job.status === 'READY' && (
                        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-200">
                          Ready
                        </span>
                      )}
                      {job.status === 'FAILED' && (
                        <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-200">
                          Failed
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Format: {job.format.toUpperCase()}
                      {job.row_count !== null && ` • ${job.row_count.toLocaleString()} rows`}
                      {job.partner_id && ` • Partner: ${partners.find(p => p.id === job.partner_id)?.venue.name || 'Unknown'}`}
                    </div>
                    {job.error_message && (
                      <p className="mt-1 text-xs text-red-300">Error: {job.error_message}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {job.status === 'READY' && job.download_url && (
                      <button
                        onClick={() => handleDownload(job)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                      >
                        Download
                      </button>
                    )}
                    {job.status === 'FAILED' && (
                      <button
                        onClick={() => handleRetry(job)}
                        disabled={loading}
                        className="rounded-lg bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700 disabled:opacity-50"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
