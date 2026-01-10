import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { AdminPasswordForm } from '@/components/admin/AdminPasswordForm';
import { AdminLayout } from '@/components/admin/AdminLayoutApp';
import { StatsCard } from '@/components/admin/StatsCard';
import { SimpleChart } from '@/components/charts/SimpleBarChart';
import { UserActivityBlock } from '@/components/admin/UserActivityBlock';
import { AlertsBlock } from '@/components/admin/AlertsBlock';
import { 
  getDiscountsByDay, 
  getDiscountsByVenue, 
  getOverviewStats,
  getUserActivityOverview,
  getMicroInsights,
  getAlerts,
} from '@/lib/stats';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminControlPage({ params }: PageProps) {
  const { slug } = await params;

  // Verify slug matches secret
  const expectedSlug = env.adminPanelSlug();
  if (slug !== expectedSlug) {
    redirect('/404');
  }

  // Check session - use getUser() for security
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login?redirect=' + encodeURIComponent(`/control/${slug}`));
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    redirect('/');
  }

  // Check for admin_gate cookie
  const cookieStore = await cookies();
  const adminGateCookie = cookieStore.get('admin_gate');

  // If no cookie, show password form
  if (!adminGateCookie) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Admin Access</h1>
            <p className="text-slate-600 mb-6">Enter admin password to continue</p>
            <AdminPasswordForm slug={slug} />
          </div>
        </div>
      </div>
    );
  }

  // Load all stats in parallel with error handling
  // Note: getAlerts will use userActivity data to avoid duplicate queries
  let overview, byVenue, daily, userActivity, microInsights, alerts;
  try {
    [overview, byVenue, daily, userActivity, microInsights] = await Promise.all([
      getOverviewStats(),
      getDiscountsByVenue(),
      getDiscountsByDay(),
      getUserActivityOverview(),
      getMicroInsights(),
    ]);
    // Get alerts after userActivity is loaded to pass it as parameter
    alerts = await getAlerts(userActivity);
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    // Return error page or fallback
    return (
      <AdminLayout slug={slug}>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="text-red-400 font-semibold text-lg mb-2">Error loading dashboard</p>
          <p className="text-red-300/80 text-sm">Please try refreshing the page</p>
        </div>
      </AdminLayout>
    );
  }

  // Limit By Venue to top 5 only (handle empty case)
  const top5Venues = byVenue.length > 0
    ? byVenue.sort((a, b) => b.total - a.total).slice(0, 5)
    : [];

  return (
    <AdminLayout slug={slug}>
      <div className="space-y-8">
        {/* Alerts Block - Always visible at top */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">Alerts & Red Flags</h2>
          <AlertsBlock alerts={alerts} />
        </div>

        {/* Overview Stats - Discounts metrics */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">Overview</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatsCard title="Discounts generated" value={overview.totalDiscounts} />
            <StatsCard title="Confirmed" value={overview.confirmedDiscounts} />
            <StatsCard title="Conversion rate" value={`${overview.conversionRate}%`} />
          </div>
        </div>

        {/* User Activity Block - New founder-level insights */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">User Activity</h2>
          <UserActivityBlock activity={userActivity} insights={microInsights} />
        </div>

        {/* Charts - Below User Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 p-4">
            <h2 className="mb-4 text-lg font-semibold text-white">Daily Usage</h2>
            {daily.length > 0 ? (
              <SimpleChart
                labels={daily.map((item) => item.date)}
                data={daily.map((item) => item.total)}
                variant="line"
                label="Codes"
              />
            ) : (
              <div className="flex h-64 items-center justify-center text-white/60">
                No data available
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 p-4">
            <h2 className="mb-4 text-lg font-semibold text-white">Top 5 Venues</h2>
            {top5Venues.length > 0 ? (
              <SimpleChart
                labels={top5Venues.map((item) => item.venueName)}
                data={top5Venues.map((item) => item.total)}
                variant="bar"
                label="Discounts"
              />
            ) : (
              <div className="flex h-64 items-center justify-center text-white/60">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

