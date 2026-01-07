import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { requireAdminAccess } from '@/lib/admin-guards-app-router';
import { AdminLayout } from '@/components/admin/AdminLayoutApp';
import { prisma } from '@/lib/prisma';
import { getUserActivityStats } from '@/lib/stats';
import Link from 'next/link';

type PageProps = {
  params: Promise<{ slug: string }>;
};

type UserStats = {
  userId: string;
  email: string;
  firstName?: string;
  verified: boolean;
  totalViews: number;
  totalQrCodes: number;
  totalVerified: number;
  uniqueVenues: number;
};

export default async function AdminUsersPage({ params }: PageProps) {
  const { slug } = await params;
  
  await requireAdminAccess(slug);

  // Get all profiles with activity
  const profiles = await prisma.profile.findMany({
    select: {
      id: true,
      email: true,
      verified_student: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get stats for each user
  const usersWithStats = await Promise.all(
    profiles.map(async (profile) => {
      try {
        const stats = await getUserActivityStats(profile.id);
        const uniqueVenues = new Set([
          ...Object.keys(stats.venueViewCounts).map(Number),
          ...Object.keys(stats.venueQrCounts).map(Number),
        ]).size;

        return {
          userId: profile.id,
          email: profile.email,
          firstName: undefined,
          verified: profile.verified_student,
          totalViews: stats.totalViews,
          totalQrCodes: stats.totalQrCodes,
          totalVerified: stats.totalVerified,
          uniqueVenues,
        };
      } catch (error) {
        console.error(`Error getting stats for user ${profile.id}:`, error);
        return {
          userId: profile.id,
          email: profile.email,
          firstName: undefined,
          verified: profile.verified_student,
          totalViews: 0,
          totalQrCodes: 0,
          totalVerified: 0,
          uniqueVenues: 0,
        };
      }
    })
  );

  // Filter out users with no activity
  const activeUsers = usersWithStats.filter(
    (u) => u.totalViews > 0 || u.totalQrCodes > 0
  );

  return (
    <AdminLayout slug={slug}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">User Statistics</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-sm font-semibold text-white/80">User</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white/80">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-white/80">Views</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-white/80">QR Codes</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-white/80">Verified</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-white/80">Venues</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-white/80">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white/60">
                    No users found
                  </td>
                </tr>
              ) : (
                activeUsers.map((user) => (
                  <tr key={user.userId} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white">{user.email}</p>
                        {user.firstName && (
                          <p className="text-xs text-white/60">{user.firstName}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          user.verified
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {user.verified ? 'Verified' : 'Not verified'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white">{user.totalViews}</td>
                    <td className="px-4 py-3 text-right text-white">{user.totalQrCodes}</td>
                    <td className="px-4 py-3 text-right text-white">{user.totalVerified}</td>
                    <td className="px-4 py-3 text-right text-white">{user.uniqueVenues}</td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/control/${slug}/users/${user.userId}`}
                        className="text-sm text-emerald-400 hover:text-emerald-300 transition"
                      >
                        View details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

