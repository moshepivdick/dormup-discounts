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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [showAllDays, setShowAllDays] = useState(false);
  const [showAllTimes, setShowAllTimes] = useState(false);
  const [showAdvancedMobile, setShowAdvancedMobile] = useState(false);
  const [confirmAdvancedOpen, setConfirmAdvancedOpen] = useState(false);
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

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

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setReportError(null);

    try {
      const response = await fetch('/api/reports/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'partner',
          month: reportMonth,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate report');
      }

      if (data.success && data.data?.snapshot?.pdf_url) {
        // Download the PDF
        const pdfUrl = data.data.snapshot.pdf_url;
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `monthly-report-${reportMonth}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Close modal after successful download
        setReportModalOpen(false);
      } else {
        throw new Error('Report generated but PDF URL not available');
      }
    } catch (error: any) {
      console.error('Error generating report:', error);
      setReportError(error.message || 'Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
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
      <main className="min-h-screen bg-slate-100 px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-7xl">
          {/* Top Bar */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Restaurant Dashboard</h1>
              <p className="mt-1 text-slate-600">{partner.venueName}</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <div className="sm:order-none">
                <DateRangeSelector value={dateRange} onChange={setDateRange} />
              </div>
              <Link
                href="/partner"
                className="text-sm text-slate-600 hover:text-slate-900 transition sm:text-right"
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
              <div className="md:hidden">
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-2xl font-semibold text-slate-900">{partner.venueName}</p>
                  <p className="mt-1 text-xs text-slate-500">Select reporting period</p>
                  <div className="mt-3">
                    <DateRangeSelector value={dateRange} onChange={setDateRange} />
                  </div>
                  <Link
                    href="/partner"
                    className="mt-3 inline-flex text-sm text-slate-600 hover:text-slate-900"
                  >
                    Back to Console
                  </Link>
                </div>

                <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-slate-900">Key results</p>
                    <p className="text-xs text-slate-500">{getDateRangeLabel()}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {[
                      {
                        label: 'Verified visits',
                        value: stats.verifiedStudentVisits.toLocaleString(),
                        tooltip: 'Confirmed discount redemptions by verified students.',
                      },
                      {
                        label: 'Discounts redeemed',
                        value: stats.discountsRedeemed.toLocaleString(),
                        tooltip: 'Total number of confirmed discount codes.',
                      },
                      {
                        label: 'Unique students',
                        value: stats.uniqueStudents.toLocaleString(),
                        tooltip: 'Students who viewed your venue page.',
                      },
                      {
                        label: 'Estimated revenue',
                        value: `€${estimatedRevenue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`,
                        tooltip: 'Based on redeemed discounts and average bill.',
                      },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl bg-slate-50 px-3 py-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12px] font-medium uppercase tracking-wide text-slate-500">
                            {item.label}
                          </p>
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-600"
                            title={item.tooltip}
                          >
                            i
                          </span>
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Last selected period.</p>
                </div>

                <div className="mt-6 space-y-4">
                  <p className="text-2xl font-semibold text-slate-900">When students come</p>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    {(() => {
                      const sortedDays = [...stats.visitsByDayOfWeek].sort(
                        (a, b) => b.confirmed - a.confirmed,
                      );
                      const topDays = showAllDays ? sortedDays : sortedDays.slice(0, 3);
                      const topDay = sortedDays[0];
                      const maxValue = Math.max(1, ...sortedDays.map((day) => day.confirmed));

                      return (
                        <>
                          <p className="text-sm font-semibold text-slate-900">Peak day</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {topDay.dayName} — {topDay.confirmed} visits
                          </p>
                          <div className="mt-4 space-y-3">
                            {topDays.map((day) => (
                              <div key={day.day} className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-slate-600">
                                  <span>{day.dayName}</span>
                                  <span>{day.confirmed}</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-100">
                                  <div
                                    className="h-2 rounded-full bg-emerald-500"
                                    style={{ width: `${(day.confirmed / maxValue) * 100}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowAllDays((prev) => !prev)}
                            className="mt-4 text-xs font-semibold text-emerald-600"
                          >
                            {showAllDays ? 'Show top days' : 'Show all days'}
                          </button>
                        </>
                      );
                    })()}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    {(() => {
                      const timeBuckets = [
                        { key: 'lunch', label: 'Lunch (12–15)', value: stats.visitsByTimeRange.lunch },
                        { key: 'dinner', label: 'Dinner (18–22)', value: stats.visitsByTimeRange.dinner },
                        { key: 'other', label: 'Other times', value: stats.visitsByTimeRange.other },
                      ];
                      const sortedTimes = [...timeBuckets].sort((a, b) => b.value - a.value);
                      const topTimes = showAllTimes ? sortedTimes : sortedTimes.slice(0, 3);
                      const topTime = sortedTimes[0];
                      const maxValue = Math.max(1, ...sortedTimes.map((item) => item.value));

                      return (
                        <>
                          <p className="text-sm font-semibold text-slate-900">Peak time</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {topTime.label} — {topTime.value} visits
                          </p>
                          <div className="mt-4 space-y-3">
                            {topTimes.map((item) => (
                              <div key={item.key} className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-slate-600">
                                  <span>{item.label}</span>
                                  <span>{item.value}</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-100">
                                  <div
                                    className="h-2 rounded-full bg-emerald-500"
                                    style={{ width: `${(item.value / maxValue) * 100}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowAllTimes((prev) => !prev)}
                            className="mt-4 text-xs font-semibold text-emerald-600"
                          >
                            {showAllTimes ? 'Show top times' : 'Show all times'}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-2xl font-semibold text-slate-900">Loyalty</p>
                  <div className="mt-4 grid grid-cols-1 gap-4">
                    {[
                      {
                        label: 'New students',
                        value: Math.max(0, stats.newStudentsCount).toLocaleString(),
                        tooltip: 'Students who redeemed their first discount.',
                      },
                      {
                        label: 'Returning students',
                        value: stats.returningStudentsCount.toLocaleString(),
                        tooltip: 'Students who redeemed two or more discounts.',
                      },
                      {
                        label: 'Avg visits / student',
                        value: stats.avgVisitsPerStudent.toLocaleString(),
                        tooltip: 'Average number of visits per student.',
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-700">{item.label}</p>
                          <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
                        </div>
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-600"
                          title={item.tooltip}
                        >
                          i
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-2xl font-semibold text-slate-900">Recent discount activity</p>
                  <div className="mt-4 space-y-4">
                    {stats.recentQrCodes.map((code) => {
                      const dateLabel = new Date(code.confirmedAt ?? code.createdAt).toLocaleString();
                      const confirmed = Boolean(code.confirmedAt) || code.status === 'confirmed';
                      return (
                        <div key={code.id} className="flex gap-3">
                          <div className="mt-1 h-3 w-3 rounded-full bg-emerald-500" />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900">QR {code.generatedCode}</p>
                              {confirmed ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  Confirmed
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-slate-500">{dateLabel}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-lg font-semibold text-amber-900">Advanced (internal)</p>
                  <p className="mt-1 text-xs text-amber-700">
                    Contains raw QR codes, user emails, and debug data.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 w-full border-amber-300 text-amber-900 hover:bg-amber-100"
                    onClick={() => setConfirmAdvancedOpen(true)}
                  >
                    {showAdvancedMobile ? 'Hide advanced data' : 'Show advanced data'}
                  </Button>
                  {showAdvancedMobile ? (
                    <div className="mt-4">
                      <AdvancedPanel
                        allDiscountUses={stats.allDiscountUses}
                        userQrCounts={stats.userQrCounts}
                        userViewCounts={stats.userViewCounts}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-2xl font-semibold text-slate-900">Settings</p>
                  <p className="mt-1 text-xs text-slate-500">Used to estimate revenue.</p>
                  <div className="mt-4 flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
                      Avg student bill (€)
                    </label>
                    <Input
                      type="number"
                      value={avgStudentBill}
                      onChange={(e) => setAvgStudentBill(e.target.value)}
                      className="h-9 w-20"
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
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-900">
                    Download a full summary for the selected period.
                  </p>
                  <Button
                    onClick={() => setReportModalOpen(true)}
                    variant="outline"
                    className="mt-4 w-full gap-2"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path d="M10 3a1 1 0 0 1 1 1v7.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4.004 4.004a1 1 0 0 1-1.414 0l-4.004-4.004a1 1 0 1 1 1.414-1.414L9 11.586V4a1 1 0 0 1 1-1Z" />
                      <path d="M4 13a1 1 0 0 1 1 1v2h10v-2a1 1 0 1 1 2 0v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" />
                    </svg>
                    Download Monthly Report
                  </Button>
                </div>
              </div>

              <div className="hidden md:block">
                {/* Executive Summary - KPI Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
                    Avg student bill (€):
                  </label>
                  <Input
                    type="number"
                    value={avgStudentBill}
                    onChange={(e) => setAvgStudentBill(e.target.value)}
                    className="h-9 w-20"
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

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-6">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Monthly report</p>
                    <p className="text-xs text-slate-500">Generate and download a PDF snapshot.</p>
                  </div>
                  <Button
                    onClick={() => setReportModalOpen(true)}
                    variant="default"
                    className="whitespace-nowrap"
                  >
                    Download Monthly Report
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Report Generation Modal */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Monthly Report</DialogTitle>
            <DialogDescription>
              Generate and download a PDF report for the selected month.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Month
              </label>
              <Input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="w-full"
                disabled={generatingReport}
              />
            </div>

            {reportError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3">
                <p className="text-sm text-rose-800">{reportError}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setReportModalOpen(false);
                  setReportError(null);
                }}
                disabled={generatingReport}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateReport}
                disabled={generatingReport}
              >
                {generatingReport ? 'Generating report...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAdvancedOpen} onOpenChange={setConfirmAdvancedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open advanced data?</DialogTitle>
            <DialogDescription>
              This section contains raw QR codes, user emails, and debug data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmAdvancedOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowAdvancedMobile(true);
                setConfirmAdvancedOpen(false);
              }}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
