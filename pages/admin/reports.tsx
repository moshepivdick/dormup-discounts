import type { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { requireAdmin } from '@/lib/guards';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type ReportsPageProps = {
  currentMonth: string;
  partners: Array<{ id: string; email: string; venueId: number; venue: { name: string } }>;
};

export default function ReportsPage({ currentMonth, partners }: ReportsPageProps) {
  const router = useRouter();
  const tabFromQuery = router.query.tab as string;
  const initialTab = (tabFromQuery && ['admin', 'partner', 'exports', 'snapshots'].includes(tabFromQuery))
    ? (tabFromQuery as 'admin' | 'partner' | 'exports' | 'snapshots')
    : 'admin';
  const [activeTab, setActiveTab] = useState<'admin' | 'partner' | 'exports' | 'snapshots'>(initialTab);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [adminReport, setAdminReport] = useState<any>(null);
  const [partnerReport, setPartnerReport] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null);

  const loadAdminReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/admin/monthly?month=${selectedMonth}`);
      const data = await res.json();
      if (data.success) {
        setAdminReport(data.data);
      }
    } catch (error) {
      console.error('Error loading admin report:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPartnerReport = async (venueId?: number) => {
    if (!venueId && !selectedPartnerId) return;
    setLoading(true);
    try {
      const partnerId = selectedPartnerId || partners.find(p => p.venueId === venueId)?.id;
      const res = await fetch(`/api/reports/partner/monthly?month=${selectedMonth}&partnerId=${partnerId}`);
      const data = await res.json();
      if (data.success) {
        setPartnerReport(data.data);
      }
    } catch (error) {
      console.error('Error loading partner report:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSnapshots = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/snapshots?month=${selectedMonth}&scope=admin`);
      const data = await res.json();
      if (data.success) {
        setSnapshots(data.data);
        return data.data; // Return for polling check
      }
    } catch (error) {
      console.error('Error loading snapshots:', error);
    } finally {
      setLoading(false);
    }
    return [];
  };

  const handleExport = async (type: 'csv' | 'json', scope: 'admin' | 'partner', partnerId?: string) => {
    const params = new URLSearchParams({
      type,
      scope,
      month: selectedMonth,
    });
    if (partnerId) params.set('partnerId', partnerId);
    
    window.open(`/api/reports/export?${params.toString()}`, '_blank');
  };

  const handleCreateSnapshot = async (scope: 'admin' | 'partner', partnerId?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          scope,
          partnerId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Immediately refresh snapshots to show PENDING status
        if (activeTab === 'snapshots') {
          await loadSnapshots();
          // Start polling if there are PENDING snapshots
          startPolling();
        } else {
          // Switch to snapshots tab and start polling
          setActiveTab('snapshots');
          setTimeout(async () => {
            await loadSnapshots();
            startPolling();
          }, 100);
        }
      } else {
        alert(`Error: ${data.message || 'Failed to create snapshot'}`);
      }
    } catch (error) {
      console.error('Error creating snapshot:', error);
      alert('Failed to create snapshot');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    // Stop any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    const startTime = Date.now();
    setPollingStartTime(startTime);

    const interval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      
      // Stop after 60 seconds
      if (elapsed > 60000) {
        clearInterval(interval);
        setPollingInterval(null);
        setPollingStartTime(null);
        return;
      }

      // Refresh snapshots
      const res = await fetch(`/api/reports/snapshots?month=${selectedMonth}&scope=admin`);
      const data = await res.json();
      if (data.success) {
        const updatedSnapshots = data.data;
        setSnapshots(updatedSnapshots);

        // Check if there are still PENDING snapshots
        const hasPending = updatedSnapshots.some((s: any) => s.status === 'PENDING');
        if (!hasPending) {
          clearInterval(interval);
          setPollingInterval(null);
          setPollingStartTime(null);
        }
      }
    }, 2000); // Poll every 2 seconds

    setPollingInterval(interval);
  };

  const handleRetrySnapshot = async (snapshot: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: snapshot.month,
          scope: snapshot.scope,
          partnerId: snapshot.partner?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadSnapshots();
        startPolling();
      } else {
        alert(`Error: ${data.message || 'Failed to retry snapshot'}`);
      }
    } catch (error) {
      console.error('Error retrying snapshot:', error);
      alert('Failed to retry snapshot');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Load data when tab or month changes
  useEffect(() => {
    if (activeTab === 'admin') {
      loadAdminReport();
    } else if (activeTab === 'snapshots') {
      loadSnapshots();
    }
    // Partner report loads on button click, not automatically
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedMonth]);

  // Check for pending snapshots after snapshots are loaded
  useEffect(() => {
    if (activeTab === 'snapshots' && snapshots.length > 0) {
      const hasPending = snapshots.some((s: any) => s.status === 'PENDING');
      if (hasPending && !pollingInterval) {
        startPolling();
      } else if (!hasPending && pollingInterval) {
        // Stop polling if no pending snapshots
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
        setPollingInterval(null);
        setPollingStartTime(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshots, activeTab, pollingInterval]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Monthly Reports</h1>
        <div className="flex items-center gap-4">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-white/20 bg-slate-800 px-4 py-2 text-white"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {(['admin', 'partner', 'exports', 'snapshots'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition ${
              activeTab === tab
                ? 'border-b-2 border-emerald-500 text-emerald-200'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Admin Report Tab */}
      {activeTab === 'admin' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <button
              onClick={loadAdminReport}
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh Report'}
            </button>
            <button
              onClick={() => handleCreateSnapshot('admin')}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Create Snapshot
            </button>
          </div>

          {adminReport && (
            <div className="space-y-6">
              {/* Global Summary */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-white/10 bg-slate-800 p-4">
                  <p className="text-sm text-slate-400">Total Partners</p>
                  <p className="text-2xl font-bold text-white">{adminReport.global.total_partners}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-800 p-4">
                  <p className="text-sm text-slate-400">Page Views</p>
                  <p className="text-2xl font-bold text-white">{adminReport.global.page_views.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-800 p-4">
                  <p className="text-sm text-slate-400">QR Redeemed</p>
                  <p className="text-2xl font-bold text-white">{adminReport.global.qr_redeemed.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-800 p-4">
                  <p className="text-sm text-slate-400">Conversion Rate</p>
                  <p className="text-2xl font-bold text-white">{adminReport.global.conversion_rate.toFixed(1)}%</p>
                </div>
              </div>

              {/* Anomalies */}
              {adminReport.anomalies && adminReport.anomalies.length > 0 && (
                <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                  <h3 className="mb-2 font-semibold text-yellow-200">Anomalies Detected</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-yellow-100">
                    {adminReport.anomalies.map((a: any, i: number) => (
                      <li key={i}>{a.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Partner Table */}
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-white">Venue</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-white">Views</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-white">Generated</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-white">Redeemed</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-white">Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminReport.partners.map((p: any) => (
                      <tr key={p.venue.id} className="border-t border-white/5">
                        <td className="px-4 py-2 text-white">{p.venue.name}</td>
                        <td className="px-4 py-2 text-right text-slate-300">{p.page_views.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-slate-300">{p.qr_generated.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-slate-300">{p.qr_redeemed.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-slate-300">{p.conversion_rate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Partner Report Tab */}
      {activeTab === 'partner' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <select
              value={selectedPartnerId}
              onChange={(e) => {
                setSelectedPartnerId(e.target.value);
                if (e.target.value) {
                  loadPartnerReport();
                }
              }}
              className="rounded-lg border border-white/20 bg-slate-800 px-4 py-2 text-white"
            >
              <option value="">Select Partner</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.venue.name} ({p.email})
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedPartnerId && loadPartnerReport()}
              disabled={loading || !selectedPartnerId}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load Report'}
            </button>
            {selectedPartnerId && (
              <button
                onClick={() => handleCreateSnapshot('partner', selectedPartnerId)}
                disabled={loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Create Snapshot
              </button>
            )}
          </div>

          {partnerReport && (
            <div className="space-y-6">
              {/* Impact Summary */}
              {partnerReport.impactSummary && (
                <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-6">
                  <h3 className="mb-4 text-xl font-semibold text-emerald-200">Impact Summary</h3>
                  <div className="space-y-2 text-base text-emerald-100">
                    <p>
                      You gained <span className="font-bold text-white">{partnerReport.impactSummary.uniqueCustomers}</span> unique student customers
                    </p>
                    <p>
                      {partnerReport.impactSummary.totalRedemptions} redemptions
                      {partnerReport.impactSummary.estimatedImpact !== null ? (
                        <span> (≈ {Math.round(partnerReport.impactSummary.estimatedImpact)}€ estimated impact)</span>
                      ) : (
                        <span> (—)</span>
                      )}
                    </p>
                    {partnerReport.impactSummary.bestTime && (
                      <p>
                        Best time to run promo: <span className="font-semibold text-white">{partnerReport.impactSummary.bestTime}</span>
                      </p>
                    )}
                  </div>
                  <p className="mt-4 text-xs text-emerald-200/80">
                    Impact is estimated (based on redemption count × avg ticket if provided).
                  </p>
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-white/10 bg-slate-800 p-4">
                  <p className="text-sm text-slate-400">Page Views</p>
                  <p className="text-2xl font-bold text-white">{partnerReport.metrics.page_views.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-800 p-4">
                  <p className="text-sm text-slate-400">QR Generated</p>
                  <p className="text-2xl font-bold text-white">{partnerReport.metrics.qr_generated.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-800 p-4">
                  <p className="text-sm text-slate-400">QR Redeemed</p>
                  <p className="text-2xl font-bold text-white">{partnerReport.metrics.qr_redeemed.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-800 p-4">
                  <p className="text-sm text-slate-400">Conversion Rate</p>
                  <p className="text-2xl font-bold text-white">{partnerReport.metrics.conversion_rate.toFixed(1)}%</p>
                </div>
              </div>

              {/* Insights */}
              {partnerReport.insights && partnerReport.insights.length > 0 && (
                <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4">
                  <h3 className="mb-2 font-semibold text-emerald-200">Insights</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-emerald-100">
                    {partnerReport.insights.map((insight: string, i: number) => (
                      <li key={i}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Exports Tab */}
      {activeTab === 'exports' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-slate-800 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Export Data</h3>
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-medium text-slate-300">Admin Export (All Partners)</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport('csv', 'admin')}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => handleExport('json', 'admin')}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
                  >
                    Export JSON
                  </button>
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium text-slate-300">Partner Export</h4>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-white/20 bg-slate-700 px-4 py-2 text-white"
                >
                  <option value="">Select Partner</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.venue.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => selectedPartnerId && handleExport('csv', 'partner', selectedPartnerId)}
                    disabled={!selectedPartnerId}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => selectedPartnerId && handleExport('json', 'partner', selectedPartnerId)}
                    disabled={!selectedPartnerId}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Export JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Snapshots Tab */}
      {activeTab === 'snapshots' && (
        <div className="space-y-4">
          <button
            onClick={loadSnapshots}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh Snapshots'}
          </button>

          {snapshots.length > 0 ? (
            <div className="space-y-2">
              {snapshots.map((snapshot: any) => {
                const status = snapshot.status || 'PENDING';
                return (
                  <div key={snapshot.id} className="rounded-lg border border-white/10 bg-slate-800 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-semibold text-white">
                            {snapshot.scope} - {snapshot.month}
                          </p>
                          {/* Status Badge */}
                          {status === 'PENDING' && (
                            <span className="flex items-center gap-2 rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-medium text-yellow-200">
                              <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Generating...
                            </span>
                          )}
                          {status === 'READY' && (
                            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-200">
                              Ready
                            </span>
                          )}
                          {status === 'FAILED' && (
                            <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-200">
                              Failed
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-400">
                          Created: {new Date(snapshot.created_at).toLocaleString()}
                          {snapshot.completed_at && (
                            <span> • Completed: {new Date(snapshot.completed_at).toLocaleString()}</span>
                          )}
                        </p>
                        {snapshot.error_message && (
                          <p className="mt-1 text-sm text-red-300">
                            Error: {snapshot.error_message}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {status === 'READY' && snapshot.pdf_url && (
                          <a
                            href={snapshot.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                          >
                            View PDF
                          </a>
                        )}
                        {status === 'READY' && snapshot.png_url && (
                          <a
                            href={snapshot.png_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                          >
                            View PNG
                          </a>
                        )}
                        {status === 'FAILED' && (
                          <button
                            onClick={() => handleRetrySnapshot(snapshot)}
                            disabled={loading}
                            className="rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400">No snapshots found for this month.</p>
          )}
        </div>
      )}
    </div>
  );
}

ReportsPage.getLayout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;

export const getServerSideProps = (async (ctx) => {
  const guard = await requireAdmin(ctx);
  if ('redirect' in guard) {
    return guard;
  }

  // Get current month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Get all partners
  const partners = await prisma.partner.findMany({
    where: { isActive: true },
    include: {
      venue: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      venue: {
        name: 'asc',
      },
    },
  });

  return {
    props: {
      currentMonth,
      partners: partners.map((p) => ({
        id: p.id,
        email: p.email,
        venueId: p.venueId,
        venue: {
          name: p.venue.name,
        },
      })),
    },
  };
}) as GetServerSideProps<ReportsPageProps>;
