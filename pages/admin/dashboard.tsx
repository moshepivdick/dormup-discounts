import type { ReactNode } from 'react';
import type { GetServerSideProps } from 'next';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatsCard } from '@/components/admin/StatsCard';
import { CreateReportButton } from '@/components/admin/CreateReportButton';
import { SimpleChart } from '@/components/charts/SimpleBarChart';
import { getDiscountsByDay, getDiscountsByVenue, getOverviewStats } from '@/lib/stats';
import { requireAdmin } from '@/lib/guards';
import type { DailyStats, OverviewStats, VenueStats } from '@/types';

type DashboardProps = {
  overview: OverviewStats;
  byVenue: VenueStats[];
  daily: DailyStats[];
};

export default function AdminDashboard({ overview, byVenue, daily }: DashboardProps) {
  return (
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
      <CreateReportButton />
    </div>
  );
}

AdminDashboard.getLayout = (page: ReactNode) => <AdminLayout>{page}</AdminLayout>;

export const getServerSideProps = (async (ctx) => {
  const guard = await requireAdmin(ctx);
  if ('redirect' in guard) {
    return guard;
  }

  const [overview, byVenue, daily] = await Promise.all([
    getOverviewStats(),
    getDiscountsByVenue(),
    getDiscountsByDay(),
  ]);

  return {
    props: {
      overview,
      byVenue,
      daily,
    },
  };
}) as GetServerSideProps<DashboardProps>;

