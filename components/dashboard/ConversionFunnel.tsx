import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ConversionFunnelProps = {
  pageViews: number;
  uniqueStudents: number;
  discountsRedeemed: number;
  verifiedVisits: number;
  conversionRates: {
    viewsToStudents: number;
    studentsToDiscounts: number;
    discountsToVerified: number;
  };
};

export function ConversionFunnel({
  pageViews,
  uniqueStudents,
  discountsRedeemed,
  verifiedVisits,
  conversionRates,
}: ConversionFunnelProps) {
  const steps = [
    { label: 'Page Views', value: pageViews },
    { label: 'Unique Students', value: uniqueStudents },
    { label: 'Discounts Redeemed', value: discountsRedeemed },
    { label: 'Verified Visits', value: verifiedVisits },
  ];

  const rates = [
    { label: 'Views → Students', value: conversionRates.viewsToStudents },
    { label: 'Students → Discounts', value: conversionRates.studentsToDiscounts },
    { label: 'Discounts → Verified', value: conversionRates.discountsToVerified },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Steps */}
          <div className="flex flex-col md:flex-row gap-4">
            {steps.map((step, index) => (
              <div key={step.label} className="flex-1">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-slate-900">{step.value.toLocaleString()}</p>
                  <p className="text-sm text-slate-600 mt-1">{step.label}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block mt-4 text-center">
                    <div className="text-xs text-slate-500">
                      {rates[index]?.value !== undefined && rates[index].value > 0
                        ? `${rates[index].value}%`
                        : '—'}
                    </div>
                    <div className="text-slate-300 mt-1">↓</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Conversion rates */}
          <div className="pt-4 border-t border-slate-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              {rates.map((rate) => (
                <div key={rate.label}>
                  <p className="text-sm text-slate-600">{rate.label}</p>
                  <p className="text-lg font-semibold text-slate-900 mt-1">
                    {rate.value > 0 ? `${rate.value}%` : '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
