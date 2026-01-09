import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type StudentJourneyProps = {
  pageViews: number;
  uniqueStudents: number;
  discountsRedeemed: number;
  verifiedVisits: number;
};

export function StudentJourney({
  pageViews,
  uniqueStudents,
  discountsRedeemed,
  verifiedVisits,
}: StudentJourneyProps) {
  const steps = [
    { label: 'Page Views', value: pageViews },
    { label: 'Unique Students', value: uniqueStudents },
    { label: 'Discounts Redeemed', value: discountsRedeemed },
    { label: 'Verified Student Visits', value: verifiedVisits },
  ];

  // Calculate main conversion: Views → Redeemed
  const viewsToRedeemed = pageViews > 0 && discountsRedeemed > 0
    ? Number(((discountsRedeemed / pageViews) * 100).toFixed(1))
    : null;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>Student Journey</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 4-step horizontal journey */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-4">
            {steps.map((step, index) => (
              <div key={step.label} className="flex-1">
                <div className="text-center">
                  <p className="text-3xl font-semibold text-slate-900">{step.value.toLocaleString()}</p>
                  <p className="text-sm text-slate-600 mt-2">{step.label}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block mt-6 text-center">
                    <div className="text-slate-300">→</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Single conversion metric */}
          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-slate-600">Views → Redeemed:</span>
              <div className="group relative">
                <span className="text-lg font-semibold text-slate-900">
                  {viewsToRedeemed !== null ? `${viewsToRedeemed}%` : '—'}
                </span>
                {viewsToRedeemed === null && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-slate-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap">
                      No data available for this calculation
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                    </div>
                  </div>
                )}
                {viewsToRedeemed !== null && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-slate-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap max-w-xs">
                      Percentage of page views that resulted in a redeemed discount
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
