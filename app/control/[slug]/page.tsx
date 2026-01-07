import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { AdminPasswordForm } from '@/components/admin/AdminPasswordForm';
import { AdminLayout } from '@/components/admin/AdminLayoutApp';
import { StatsCard } from '@/components/admin/StatsCard';
import { SimpleChart } from '@/components/charts/SimpleBarChart';
import { getDiscountsByDay, getDiscountsByVenue, getOverviewStats } from '@/lib/stats';

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

  // Check session
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect('/login?redirect=' + encodeURIComponent(`/control/${slug}`));
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
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

  // Load stats and show dashboard
  const [overview, byVenue, daily] = await Promise.all([
    getOverviewStats(),
    getDiscountsByVenue(),
    getDiscountsByDay(),
  ]);

  return (
    <AdminLayout slug={slug}>
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatsCard title="Discounts generated" value={overview.totalDiscounts} />
          <StatsCard title="Confirmed" value={overview.confirmedDiscounts} />
          <StatsCard title="Conversion rate" value={`${overview.conversionRate}%`} />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 p-4">
            <h2 className="mb-4 text-lg font-semibold text-white">Daily usage</h2>
            <SimpleChart
              labels={daily.map((item) => item.date)}
              data={daily.map((item) => item.total)}
              variant="line"
              label="Codes"
            />
          </div>
          <div className="rounded-2xl border border-white/10 p-4">
            <h2 className="mb-4 text-lg font-semibold text-white">By venue</h2>
            <SimpleChart
              labels={byVenue.map((item) => item.venueName)}
              data={byVenue.map((item) => item.total)}
              variant="bar"
              label="Discounts"
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

