import Head from 'next/head';
import { useState, useEffect } from 'react';
import type { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { requirePartner } from '@/lib/guards';
import Link from 'next/link';
import { DateRangeSelector, getDateRangeDates } from '@/components/dashboard/DateRangeSelector';
import { KPICard } from '@/components/dashboard/KPICard';
import { StudentJourney } from '@/components/dashboard/StudentJourney';
import { VisitsByDayOfWeek } from '@/components/dashboard/VisitsByDayOfWeek';
import { VisitsByTimeRange } from '@/components/dashboard/VisitsByTimeRange';
import { LoyaltySection } from '@/components/dashboard/LoyaltySection';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { AdvancedPanel } from '@/components/dashboard/AdvancedPanel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type PartnerStatsProps = {
  partner: {
    email: string;
    venueName: string;
    venueId: number;
  };
};

type DateRange = '7d' | '30d' | '90d' | 'all';

type Stats = {
  pageViews: number;
  uniqueStudents: number;
  discountsRedeemed: number;
  verifiedStudentVisits: number;
  returningStudentsCount: number;
  newStudentsCount: number;
  avgVisitsPerStudent: number;
  conversionRates: {
    viewsToStudents: number;
    studentsToDiscounts: number;
    discountsToVerified: number;
  };
  visitsByDayOfWeek: Array<{
    day: number;
    dayName: string;
    views: number;
    confirmed: number;
  }>;
  visitsByTimeRange: {
    lunch: number;
    dinner: number;
    other: number;
  };
  recentQrCodes: Array<{
    id: number;
    generatedCode: string;
    status: string;
    createdAt: string | Date;
    confirmedAt: string | Date | null;
  }>;
  userQrCounts: Record<string, { generated: number; verified: number; email?: string; name?: string }>;
  userViewCounts: Record<string, number>;
  allDiscountUses: Array<{
    id: number;
    generatedCode: string;
    status: string;
    createdAt: string | Date;
    confirmedAt: string | Date | null;
    profiles?: { email: string; first_name: string | null } | null;
  }>;
};

export default function PartnerStatsPage({ partner }: PartnerStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [avgStudentBill, setAvgStudentBill] = useState<string>('15');
  const [savingBill, setSavingBill] = useState(false);
  const [billSaved, setBillSaved] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const { startDate, endDate } = getDateRangeDates(dateRange);
        const params = new URLSearchParams();
        if (startDate) {
          params.append('startDate', startDate.toISOString());
        }
        if (endDate) {
          params.append('endDate', endDate.toISOString());
        }

        const response = await fetch(`/api/partner/stats?${params.toString()}`);
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
  }, [dateRange]);

  // Load avgStudentBill from venue
  useEffect(() => {
    const fetchVenue = async () => {
      try {
        const response = await fetch(`/api/venues/${partner.venueId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.venue?.avgStudentBill) {
            setAvgStudentBill(data.data.venue.avgStudentBill.toString());
          }
        }
      } catch (error) {
        console.error('Error fetching venue:', error);
      }
    };
    fetchVenue();
  }, [partner.venueId]);

  const handleSaveBill = async () => {
    setSavingBill(true);
    setBillSaved(false);
    try {
      const response = await fetch('/api/partner/venue-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avgStudentBill: parseFloat(avgStudentBill) || 0 }),
      });
      if (response.ok) {
        setBillSaved(true);
        setTimeout(() => setBillSaved(false), 2000);
      }
    } catch (error) {
      console.error('Error saving bill:', error);
    } finally {
      setSavingBill(false);
    }
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      case 'all': return 'All time';
    }
  };

  const estimatedRevenue = stats
    ? stats.discountsRedeemed * parseFloat(avgStudentBill || '0')
    : 0;

  return (
    <>
      <Head>
        <title>Restaurant Dashboard | DormUp Discounts</title>
      </Head>
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-7xl">
          {/* Top Bar */}
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Restaurant Dashboard</h1>
              <p className="mt-1 text-slate-600">{partner.venueName}</p>
            </div>
            <div className="flex items-center gap-4">
              <DateRangeSelector value={dateRange} onChange={setDateRange} />
              <Link
                href="/partner"
                className="text-sm text-slate-600 hover:text-slate-900 transition"
              >
                Back to Console
              </Link>
            </div>
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
            <div className="space-y-8">
              {/* Executive Summary - KPI Cards */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <KPICard
                  title="Verified Student Visits"
                  value={stats.verifiedStudentVisits}
                  subtitle={getDateRangeLabel()}
                  highlight
                  hero
                  tooltip="Number of confirmed discount redemptions by verified students"
                />
                <KPICard
                  title="Unique Students"
                  value={stats.uniqueStudents}
                  subtitle={getDateRangeLabel()}
                  tooltip="Number of unique students who viewed your venue page"
                />
                <KPICard
                  title="Discounts Redeemed"
                  value={stats.discountsRedeemed}
                  subtitle={getDateRangeLabel()}
                  tooltip="Total number of discount codes confirmed/redeemed"
                />
                <KPICard
                  title="Returning Students"
                  value={stats.returningStudentsCount}
                  subtitle={getDateRangeLabel()}
                  tooltip="Students who have redeemed 2 or more discounts"
                />
                <KPICard
                  title="Estimated Revenue"
                  value={`€${estimatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  subtitle={getDateRangeLabel()}
                  highlight
                  tooltip="Estimated revenue based on redeemed discounts and average student bill"
                />
              </div>

              {/* Revenue Input - Compact Inline */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
                  Avg student bill (€):
                </label>
                <Input
                  type="number"
                  value={avgStudentBill}
                  onChange={(e) => setAvgStudentBill(e.target.value)}
                  className="w-20 h-9"
                  min="0"
                  step="0.01"
                />
                <Button
                  size="sm"
                  onClick={handleSaveBill}
                  disabled={savingBill}
                  className="h-9"
                >
                  {savingBill ? 'Saving...' : billSaved ? 'Saved!' : 'Save'}
                </Button>
              </div>

              {/* Student Journey */}
              <StudentJourney
                pageViews={stats.pageViews}
                uniqueStudents={stats.uniqueStudents}
                discountsRedeemed={stats.discountsRedeemed}
                verifiedVisits={stats.verifiedStudentVisits}
              />

              {/* Operational Insights */}
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <VisitsByDayOfWeek data={stats.visitsByDayOfWeek} />
                <VisitsByTimeRange
                  lunch={stats.visitsByTimeRange.lunch}
                  dinner={stats.visitsByTimeRange.dinner}
                  other={stats.visitsByTimeRange.other}
                />
              </div>

              {/* Loyalty */}
              <LoyaltySection
                newStudents={stats.newStudentsCount}
                returningStudents={stats.returningStudentsCount}
                avgVisitsPerStudent={stats.avgVisitsPerStudent}
              />

              {/* Recent Activity */}
              <RecentActivity recentCodes={stats.recentQrCodes} />

              {/* Advanced Panel */}
              <AdvancedPanel
                allDiscountUses={stats.allDiscountUses}
                userQrCounts={stats.userQrCounts}
                userViewCounts={stats.userViewCounts}
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
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
