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
      {scope === 'admin' && reportData.global && (
        <div className="space-y-6">
          {/* Global Summary */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">Global Summary</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600">Total Partners</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{reportData.global.total_partners}</p>
              </div>
              <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600">Page Views</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{reportData.global.page_views.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600">QR Redeemed</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{reportData.global.qr_redeemed.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{reportData.global.conversion_rate.toFixed(1)}%</p>
              </div>
            </div>
          </section>

          {/* Anomalies */}
          {reportData.anomalies && reportData.anomalies.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">Anomalies</h2>
              <div className="rounded-lg border-2 border-yellow-300 bg-yellow-50 p-4">
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-800">
                  {reportData.anomalies.map((anomaly: any, i: number) => (
                    <li key={i}>{anomaly.message}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Partner Table */}
          {reportData.partners && reportData.partners.length > 0 && (
            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-900">Per-Partner Metrics</h2>
              <table className="w-full border-collapse border-2 border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">Venue</th>
                    <th className="border-2 border-gray-300 px-4 py-2 text-right font-semibold text-gray-900">Views</th>
                    <th className="border-2 border-gray-300 px-4 py-2 text-right font-semibold text-gray-900">Generated</th>
                    <th className="border-2 border-gray-300 px-4 py-2 text-right font-semibold text-gray-900">Redeemed</th>
                    <th className="border-2 border-gray-300 px-4 py-2 text-right font-semibold text-gray-900">Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.partners.map((p: any) => (
                    <tr key={p.venue.id} className="border-b border-gray-200">
                      <td className="border-2 border-gray-300 px-4 py-2 text-gray-900">{p.venue.name}</td>
                      <td className="border-2 border-gray-300 px-4 py-2 text-right text-gray-700">{p.page_views.toLocaleString()}</td>
                      <td className="border-2 border-gray-300 px-4 py-2 text-right text-gray-700">{p.qr_generated.toLocaleString()}</td>
                      <td className="border-2 border-gray-300 px-4 py-2 text-right text-gray-700">{p.qr_redeemed.toLocaleString()}</td>
                      <td className="border-2 border-gray-300 px-4 py-2 text-right text-gray-700">{p.conversion_rate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      )}

      {/* Partner Report */}
      {scope === 'partner' && reportData.metrics && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">Monthly Summary</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600">Page Views</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{reportData.metrics.page_views.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600">QR Generated</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{reportData.metrics.qr_generated.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600">QR Redeemed</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{reportData.metrics.qr_redeemed.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{reportData.metrics.conversion_rate.toFixed(1)}%</p>
              </div>
            </div>
          </section>

          {/* Additional Metrics */}
          <section>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600">Unique Users</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{reportData.metrics.unique_users.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600">Repeat Users</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{reportData.metrics.repeat_users.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600">Avg per User</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {reportData.metrics.unique_users > 0
                    ? (reportData.metrics.qr_redeemed / reportData.metrics.unique_users).toFixed(1)
                    : '0'}
                </p>
              </div>
            </div>
          </section>

          {/* Insights */}
          {reportData.insights && reportData.insights.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">Insights</h2>
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
