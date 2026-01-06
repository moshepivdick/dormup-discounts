import Head from 'next/head';
import { useState, useEffect } from 'react';
import type { GetServerSideProps } from 'next';
import { auth } from '@/lib/auth';
import { requirePartner } from '@/lib/guards';
import Link from 'next/link';

type PartnerStatsProps = {
  partner: {
    email: string;
    venueName: string;
    venueId: number;
  };
};

type Stats = {
  totalViews: number;
  totalQrCodes: number;
  totalVerified: number;
  uniqueUsers: number;
  userViewCounts: Record<string, number>;
  userQrCounts: Record<string, { generated: number; verified: number; email?: string; name?: string }>;
  recentViews: Array<{
    id: number;
    createdAt: string | Date;
    user_id: string | null;
    profiles: { email: string; first_name: string | null } | null;
  }>;
  recentQrCodes: Array<{
    id: number;
    generatedCode: string;
    status: string;
    createdAt: string | Date;
    confirmedAt: string | Date | null;
    user_id: string | null;
    profiles: { email: string; first_name: string | null } | null;
  }>;
};

export default function PartnerStatsPage({ partner }: PartnerStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/partner/stats');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.stats) {
            setStats(data.data.stats);
          }
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <>
      <Head>
        <title>Statistics | DormUp Discounts</title>
      </Head>
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Venue Statistics</h1>
              <p className="mt-1 text-slate-600">{partner.venueName}</p>
            </div>
            <Link
              href="/partner"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back to Console
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-slate-600">Loading statistics...</p>
            </div>
          ) : !stats ? (
            <div className="rounded-2xl bg-white p-8 text-center">
              <p className="text-slate-600">Failed to load statistics</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-600">Total Views</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.totalViews}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-600">QR Codes</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.totalQrCodes}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-600">Verified</p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-600">{stats.totalVerified}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-600">Unique Users</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.uniqueUsers}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* User Activity */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">User Activity</h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {Object.entries(stats.userQrCounts).length === 0 ? (
                      <p className="text-slate-600">No user activity yet</p>
                    ) : (
                      Object.entries(stats.userQrCounts)
                        .sort(([, a], [, b]) => b.generated - a.generated)
                        .map(([userId, counts]) => (
                          <div
                            key={userId}
                            className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                          >
                            <div>
                              <p className="font-medium text-slate-900">
                                {counts.name || counts.email || 'Unknown User'}
                              </p>
                              <p className="text-xs text-slate-600">
                                {counts.verified} verified of {counts.generated} codes
                              </p>
                              <p className="text-xs text-slate-500">
                                {stats.userViewCounts[userId] || 0} views
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-900">
                                {counts.generated}
                              </p>
                              <p className="text-xs text-slate-500">QR codes</p>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Recent QR Codes */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent QR Codes</h2>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {stats.recentQrCodes.length === 0 ? (
                      <p className="text-slate-600">No QR codes generated yet</p>
                    ) : (
                      stats.recentQrCodes.slice(0, 20).map((qr) => (
                        <div
                          key={qr.id}
                          className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                        >
                          <div>
                            <p className="font-mono text-sm font-semibold text-slate-900">
                              {qr.generatedCode}
                            </p>
                            <p className="text-xs text-slate-600">
                              {qr.profiles?.email || 'Unknown user'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(qr.createdAt as string).toLocaleString()}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              qr.status === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {qr.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Views */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent Views</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.recentViews.length === 0 ? (
                    <p className="text-slate-600">No views yet</p>
                  ) : (
                    stats.recentViews.slice(0, 20).map((view) => (
                      <div
                        key={view.id}
                        className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {view.profiles?.email || 'Anonymous'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(view.createdAt as string).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PartnerStatsProps> = async (ctx) => {
  const guard = await requirePartner(ctx);
  if ('redirect' in guard) {
    return guard;
  }

  const partner = guard.partner;

  if (!partner.venue) {
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

