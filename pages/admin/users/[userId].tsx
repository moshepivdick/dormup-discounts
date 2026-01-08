import type { ReactNode } from 'react';
import type { GetServerSideProps } from 'next';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/guards';
import { getUserActivityStats } from '@/lib/stats';

type UserDetailProps = {
  user: {
    id: string;
    email: string;
    firstName?: string;
    verified: boolean;
    createdAt: string;
  };
  stats: Awaited<ReturnType<typeof getUserActivityStats>>;
};

export default function UserDetailPage({ user, stats }: UserDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">{user.email}</h2>
          {user.firstName && (
            <p className="mt-1 text-white/60">{user.firstName}</p>
          )}
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
            user.verified
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-amber-500/20 text-amber-300'
          }`}
        >
          {user.verified ? 'Verified Student' : 'Not verified'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-white/60">Total Views</p>
          <p className="mt-2 text-3xl font-semibold text-white">{stats.totalViews}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-white/60">QR Codes</p>
          <p className="mt-2 text-3xl font-semibold text-white">{stats.totalQrCodes}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-white/60">Verified</p>
          <p className="mt-2 text-3xl font-semibold text-white">{stats.totalVerified}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-white/60">First Visits</p>
          <p className="mt-2 text-3xl font-semibold text-white">{stats.firstVisits.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Venue Views */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-4 text-lg font-semibold text-white">Venue Views</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(stats.venueViewCounts).length === 0 ? (
              <p className="text-white/60">No views yet</p>
            ) : (
              Object.entries(stats.venueViewCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([venueId, count]) => {
                  const venue = stats.recentViews.find((v) => v.venueId === Number(venueId))?.venue;
                  return (
                    <div
                      key={venueId}
                      className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                    >
                      <span className="text-white">{venue?.name || `Venue ${venueId}`}</span>
                      <span className="text-emerald-400 font-semibold">{count}</span>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* QR Codes by Venue */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-4 text-lg font-semibold text-white">QR Codes by Venue</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(stats.venueQrCounts).length === 0 ? (
              <p className="text-white/60">No QR codes generated</p>
            ) : (
              Object.entries(stats.venueQrCounts)
                .sort(([, a], [, b]) => b.generated - a.generated)
                .slice(0, 10)
                .map(([venueId, counts]) => {
                  const venue = stats.recentQrCodes.find((q) => q.venueId === Number(venueId))?.venue;
                  return (
                    <div
                      key={venueId}
                      className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                    >
                      <div>
                        <p className="text-white">{venue?.name || `Venue ${venueId}`}</p>
                        <p className="text-xs text-white/60">
                          {counts.verified} verified of {counts.generated}
                        </p>
                      </div>
                      <span className="text-emerald-400 font-semibold">{counts.generated}</span>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="mb-4 text-lg font-semibold text-white">Recent Activity</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {stats.recentViews.length === 0 && stats.recentQrCodes.length === 0 ? (
            <p className="text-white/60">No activity yet</p>
          ) : (
            [...stats.recentViews, ...stats.recentQrCodes]
              .sort((a, b) => {
                const dateA = 'createdAt' in a ? a.createdAt : new Date(0);
                const dateB = 'createdAt' in b ? b.createdAt : new Date(0);
                return dateB.getTime() - dateA.getTime();
              })
              .slice(0, 20)
              .map((item, idx) => {
                const isView = 'venue' in item && 'venueId' in item;
                if (isView) {
                  const view = item as typeof stats.recentViews[0];
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                    >
                      <div>
                        <p className="text-white">
                          Viewed - {view.venue?.name || 'Unknown Venue'}
                        </p>
                        <p className="text-xs text-white/60">
                          {new Date(view.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                } else {
                  const qr = item as typeof stats.recentQrCodes[0];
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                    >
                      <div>
                        <p className="text-white">
                          QR Code - {qr.venue.name}
                        </p>
                        <p className="text-xs text-white/60">
                          {new Date(qr.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          qr.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {qr.status}
                      </span>
                    </div>
                  );
                }
              })
          )}
        </div>
      </div>
    </div>
  );
}

UserDetailPage.getLayout = (page: ReactNode) => <AdminLayout>{page}</AdminLayout>;

export const getServerSideProps = (async (ctx) => {
  const guard = await requireAdmin(ctx);
  if ('redirect' in guard) {
    return guard;
  }

  const userId = ctx.params?.userId as string;
  if (!userId) {
    return { notFound: true };
  }

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      verified_student: true,
      createdAt: true,
    },
  });

  if (!profile) {
    return { notFound: true };
  }

  const stats = await getUserActivityStats(profile.id);

  return {
    props: {
      user: {
        id: profile.id,
        email: profile.email,
        firstName: undefined,
        verified: profile.verified_student,
        createdAt: profile.createdAt.toISOString(),
      },
      stats,
    },
  };
}) as GetServerSideProps<UserDetailProps>;

