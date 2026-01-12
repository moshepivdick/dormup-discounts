import type { GetServerSideProps } from 'next';
import { verifyReportToken } from '@/lib/report-token';
import { prisma } from '@/lib/prisma';
import { getMonthlyAdminReport, getMonthlyPartnerReport, parseMonth } from '@/lib/reports';

type PrintPageProps = {
  scope: 'admin' | 'partner';
  month: string;
  reportData: any;
  venueName?: string;
};

export default function PrintReportPage({ scope, month, reportData, venueName }: PrintPageProps) {
  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          section {
            break-inside: avoid;
          }
          table {
            break-inside: avoid;
          }
          tr {
            break-inside: avoid;
          }
        }
        .no-print {
          display: none;
        }
      `}</style>

      {/* Header */}
      <div className="mb-8 border-b-2 border-gray-300 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">
          {scope === 'admin' ? 'Admin Monthly Report' : 'Partner Monthly Report'}
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          {venueName && <span className="font-semibold">{venueName} - </span>}
          {new Date(`${month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Generated: {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}
        </p>
      </div>

      {/* Admin Report */}
      {scope === 'admin' && (reportData.currentMonth || reportData.global) && (
        <div className="space-y-6">
          {/* Page 1: Global Summary, Funnel, Insights */}
          <div style={{ pageBreakAfter: 'always' }} className="space-y-6">
            {/* Global Summary with MoM */}
            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-900">Global Summary</h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4" style={{ breakInside: 'avoid' }}>
                  <p className="text-sm font-medium text-gray-600">Total Partners</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{reportData.currentMonth?.total_partners || reportData.global.total_partners}</p>
                  {reportData.currentMonth?.mom?.page_views && reportData.previousMonth && (
                    <p className="mt-1 text-xs text-gray-500">
                      {(() => {
                        const prev = reportData.previousMonth.total_partners;
                        const curr = reportData.currentMonth?.total_partners || reportData.global.total_partners;
                        const delta = curr - prev;
                        if (prev < 3 && delta !== 0) {
                          return `${delta > 0 ? '+' : ''}${delta} vs last month`;
                        } else if (prev >= 3 && reportData.currentMonth.mom.page_views.pct !== null) {
                          return `${reportData.currentMonth.mom.page_views.pct > 0 ? '+' : ''}${reportData.currentMonth.mom.page_views.pct.toFixed(1)}% vs last month`;
                        }
                        return '—';
                      })()}
                    </p>
                  )}
                </div>
                <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4" style={{ breakInside: 'avoid' }}>
                  <p className="text-sm font-medium text-gray-600">Page Views</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{(reportData.currentMonth?.page_views || reportData.global.page_views).toLocaleString()}</p>
                  {reportData.currentMonth?.mom?.page_views && reportData.previousMonth && (
                    <p className="mt-1 text-xs text-gray-500">
                      {(() => {
                        const prev = reportData.previousMonth.page_views;
                        const curr = reportData.currentMonth?.page_views || reportData.global.page_views;
                        const delta = curr - prev;
                        if (prev < 3 && delta !== 0) {
                          return `${delta > 0 ? '+' : ''}${delta} vs last month`;
                        } else if (prev >= 3 && reportData.currentMonth.mom.page_views.pct !== null) {
                          return `${reportData.currentMonth.mom.page_views.pct > 0 ? '+' : ''}${reportData.currentMonth.mom.page_views.pct.toFixed(1)}% vs last month`;
                        }
                        return '—';
                      })()}
                    </p>
                  )}
                </div>
                <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4" style={{ breakInside: 'avoid' }}>
                  <p className="text-sm font-medium text-gray-600">QR Redeemed</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{(reportData.currentMonth?.qr_redeemed || reportData.global.qr_redeemed).toLocaleString()}</p>
                  {reportData.currentMonth?.mom?.qr_redeemed && reportData.previousMonth && (
                    <p className="mt-1 text-xs text-gray-500">
                      {(() => {
                        const prev = reportData.previousMonth.qr_redeemed;
                        const curr = reportData.currentMonth?.qr_redeemed || reportData.global.qr_redeemed;
                        const delta = curr - prev;
                        if (prev < 3 && delta !== 0) {
                          return `${delta > 0 ? '+' : ''}${delta} vs last month`;
                        } else if (prev >= 3 && reportData.currentMonth.mom.qr_redeemed.pct !== null) {
                          return `${reportData.currentMonth.mom.qr_redeemed.pct > 0 ? '+' : ''}${reportData.currentMonth.mom.qr_redeemed.pct.toFixed(1)}% vs last month`;
                        }
                        return '—';
                      })()}
                    </p>
                  )}
                </div>
                <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4" style={{ breakInside: 'avoid' }}>
                  <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{(reportData.currentMonth?.conversion_rate || reportData.global.conversion_rate).toFixed(1)}%</p>
                  {reportData.currentMonth?.mom?.conversion_rate && (
                    <p className="mt-1 text-xs text-gray-500">
                      {reportData.currentMonth.mom.conversion_rate.delta !== null ? (
                        <>
                          {reportData.currentMonth.mom.conversion_rate.delta > 0 ? '+' : ''}
                          {reportData.currentMonth.mom.conversion_rate.delta.toFixed(1)}pp vs last month
                        </>
                      ) : (
                        '—'
                      )}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Funnel Block */}
            {reportData.funnel && (
              <section style={{ breakInside: 'avoid' }}>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">Funnel Overview</h2>
                <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="text-sm font-medium text-gray-600">Page Views</p>
                      <p className="mt-1 text-3xl font-bold text-gray-900">{reportData.funnel.page_views.toLocaleString()}</p>
                    </div>
                    <div className="text-2xl text-gray-400">→</div>
                    <div className="text-center flex-1">
                      <p className="text-sm font-medium text-gray-600">QR Generated</p>
                      <p className="mt-1 text-3xl font-bold text-gray-900">{reportData.funnel.qr_generated.toLocaleString()}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {reportData.funnel.page_views > 0
                          ? `${((reportData.funnel.qr_generated / reportData.funnel.page_views) * 100).toFixed(1)}% conversion`
                          : '—'}
                      </p>
                    </div>
                    <div className="text-2xl text-gray-400">→</div>
                    <div className="text-center flex-1">
                      <p className="text-sm font-medium text-gray-600">QR Redeemed</p>
                      <p className="mt-1 text-3xl font-bold text-gray-900">{reportData.funnel.qr_redeemed.toLocaleString()}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {reportData.funnel.qr_generated > 0
                          ? `${((reportData.funnel.qr_redeemed / reportData.funnel.qr_generated) * 100).toFixed(1)}% conversion`
                          : '—'}
                      </p>
                    </div>
                  </div>
                  {reportData.funnel.explanation && (
                    <p className="mt-4 text-center text-sm text-gray-600 italic">
                      {reportData.funnel.explanation}
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Top Insights */}
            {reportData.insights && reportData.insights.length > 0 && (
              <section style={{ breakInside: 'avoid' }}>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">Top Insights</h2>
                <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
                  <ul className="list-disc list-inside space-y-2 text-sm text-gray-800">
                    {reportData.insights.map((insight: string, i: number) => (
                      <li key={i}>{insight}</li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>

          {/* Page 2: Partner Breakdown, Anomalies */}
          <div className="space-y-6">
            {/* Partner Breakdown Table */}
            {(reportData.perPartner || reportData.partners) && (reportData.perPartner || reportData.partners).length > 0 && (
              <section style={{ breakInside: 'avoid' }}>
                <h2 className="mb-4 text-2xl font-semibold text-gray-900">Partner Breakdown</h2>
                <table className="w-full border-collapse border-2 border-gray-300" style={{ breakInside: 'avoid' }}>
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">Partner</th>
                      <th className="border-2 border-gray-300 px-4 py-2 text-right font-semibold text-gray-900">Page Views</th>
                      <th className="border-2 border-gray-300 px-4 py-2 text-right font-semibold text-gray-900">QR Generated</th>
                      <th className="border-2 border-gray-300 px-4 py-2 text-right font-semibold text-gray-900">QR Redeemed</th>
                      <th className="border-2 border-gray-300 px-4 py-2 text-right font-semibold text-gray-900">Conversion %</th>
                      <th className="border-2 border-gray-300 px-4 py-2 text-center font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.perPartner || reportData.partners || []).map((p: any, i: number) => (
                      <tr key={i} className="border-b border-gray-200">
                        <td className="border-2 border-gray-300 px-4 py-2 text-gray-900">{p.venue_name || p.venue?.name || p.partner_name}</td>
                        <td className="border-2 border-gray-300 px-4 py-2 text-right text-gray-700">{p.page_views.toLocaleString()}</td>
                        <td className="border-2 border-gray-300 px-4 py-2 text-right text-gray-700">{p.qr_generated.toLocaleString()}</td>
                        <td className="border-2 border-gray-300 px-4 py-2 text-right text-gray-700">{p.qr_redeemed.toLocaleString()}</td>
                        <td className="border-2 border-gray-300 px-4 py-2 text-right text-gray-700">{p.conversion_rate.toFixed(1)}%</td>
                        <td className="border-2 border-gray-300 px-4 py-2 text-center text-gray-700">
                          {p.status || 'OK'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* Anomalies/Alerts Block */}
            {reportData.anomalies && reportData.anomalies.length > 0 && (
              <section style={{ breakInside: 'avoid' }}>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">Anomalies & Alerts</h2>
                {reportData.anomalies.length === 1 && reportData.anomalies[0].title === 'No anomalies' ? (
                  <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-800">No anomalies detected this period.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reportData.anomalies.map((a: any, i: number) => (
                      <div
                        key={i}
                        className={`rounded-lg border-2 p-3 ${
                          a.severity === 'critical'
                            ? 'bg-rose-50 border-rose-300'
                            : a.severity === 'warn'
                              ? 'bg-yellow-50 border-yellow-300'
                              : 'bg-blue-50 border-blue-300'
                        }`}
                      >
                        <p className="font-semibold text-gray-900">
                          <span className={`rounded px-2 py-1 text-xs font-medium mr-2 ${
                            a.severity === 'critical'
                              ? 'bg-rose-500 text-white'
                              : a.severity === 'warn'
                                ? 'bg-yellow-500 text-white'
                                : 'bg-blue-500 text-white'
                          }`}>
                            {a.severity?.toUpperCase() || 'INFO'}
                          </span>
                          {a.title || a.message}
                        </p>
                        {a.description && <p className="mt-1 text-sm text-gray-700">{a.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      )}

      {/* Partner Report */}
      {scope === 'partner' && reportData.metrics && (
        <div className="space-y-6">
          {/* Impact Summary */}
          {reportData.impactSummary && (
            <section style={{ breakInside: 'avoid' }}>
              <h2 className="mb-4 text-2xl font-semibold text-gray-900">Impact Summary</h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-600">Unique Customers</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{reportData.impactSummary.uniqueCustomers.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-600">Total Redemptions</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{reportData.impactSummary.totalRedemptions.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-600">Estimated Impact</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">
                    {reportData.impactSummary.estimatedImpact
                      ? `€${reportData.impactSummary.estimatedImpact.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                  </p>
                  {reportData.impactSummary.avgTicket && (
                    <p className="mt-1 text-xs text-gray-500">
                      Avg ticket: €{reportData.impactSummary.avgTicket.toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-600">Best Time</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {reportData.impactSummary.bestTime || '—'}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Funnel Overview */}
          <section style={{ breakInside: 'avoid' }}>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">Funnel Overview</h2>
            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-6">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-sm font-medium text-gray-600">Page Views</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{reportData.metrics.page_views.toLocaleString()}</p>
                </div>
                <div className="text-2xl text-gray-400">→</div>
                <div className="text-center flex-1">
                  <p className="text-sm font-medium text-gray-600">QR Generated</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{reportData.metrics.qr_generated.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {reportData.metrics.page_views > 0
                      ? `${((reportData.metrics.qr_generated / reportData.metrics.page_views) * 100).toFixed(1)}% conversion`
                      : '—'}
                  </p>
                </div>
                <div className="text-2xl text-gray-400">→</div>
                <div className="text-center flex-1">
                  <p className="text-sm font-medium text-gray-600">QR Redeemed</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{reportData.metrics.qr_redeemed.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {reportData.metrics.qr_generated > 0
                      ? `${reportData.metrics.conversion_rate.toFixed(1)}% conversion`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Top Insights */}
          {reportData.insights && reportData.insights.length > 0 && (
            <section style={{ breakInside: 'avoid' }}>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">Top Insights</h2>
              <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-800">
                  {reportData.insights.map((insight: string, i: number) => (
                    <li key={i}>{insight}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Alerts & Recommendations */}
          {reportData.alerts && reportData.alerts.length > 0 ? (
            <section style={{ breakInside: 'avoid' }}>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">Alerts & Recommendations</h2>
              <div className="space-y-2">
                {reportData.alerts.map((alert: any, i: number) => (
                  <div
                    key={i}
                    className={`rounded-lg border-2 p-3 ${
                      alert.severity === 'critical'
                        ? 'bg-rose-50 border-rose-300'
                        : alert.severity === 'warn'
                          ? 'bg-yellow-50 border-yellow-300'
                          : 'bg-blue-50 border-blue-300'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">
                      <span className={`rounded px-2 py-1 text-xs font-medium mr-2 ${
                        alert.severity === 'critical'
                          ? 'bg-rose-500 text-white'
                          : alert.severity === 'warn'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-blue-500 text-white'
                      }`}>
                        {alert.severity?.toUpperCase() || 'INFO'}
                      </span>
                      {alert.title || alert.message}
                    </p>
                    {alert.description && <p className="mt-1 text-sm text-gray-700">{alert.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section style={{ breakInside: 'avoid' }}>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">Alerts & Recommendations</h2>
              <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-800">No alerts or recommendations at this time.</p>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 border-t-2 border-gray-300 pt-4 text-center text-sm text-gray-500">
        <p>DormUp Discounts - Monthly Report</p>
        <p className="mt-1">Confidential - For internal use only</p>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<PrintPageProps> = async (ctx) => {
  const { token, scope, month, partnerId } = ctx.query;

  // Verify token
  if (!token || typeof token !== 'string') {
    return { notFound: true };
  }

  const payload = verifyReportToken(token);
  if (!payload) {
    return { notFound: true };
  }

  // Validate query params match token
  if (payload.scope !== scope || payload.month !== month) {
    return { notFound: true };
  }

  // Validate month format
  let monthStr = month as string;
  try {
    parseMonth(monthStr);
  } catch {
    return { notFound: true };
  }

  // Load report data
  try {
    let reportData: any;
    let venueName: string | undefined;

    if (payload.scope === 'admin') {
      reportData = await getMonthlyAdminReport(monthStr);
    } else {
      // Partner report
      if (!payload.venueId) {
        return { notFound: true };
      }
      reportData = await getMonthlyPartnerReport(payload.venueId, monthStr);
      
      // Get venue name
      const venue = await prisma.venue.findUnique({
        where: { id: payload.venueId },
        select: { name: true },
      });
      venueName = venue?.name;
    }

    return {
      props: {
        scope: payload.scope,
        month: monthStr,
        reportData,
        venueName,
      },
    };
  } catch (error) {
    console.error('Error loading report data:', error);
    return { notFound: true };
  }
};
