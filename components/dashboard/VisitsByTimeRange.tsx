import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type VisitsByTimeRangeProps = {
  lunch: number;
  dinner: number;
  other: number;
};

export function VisitsByTimeRange({ lunch, dinner, other }: VisitsByTimeRangeProps) {
  const data = [
    { label: 'Lunch (12-15)', value: lunch },
    { label: 'Dinner (18-22)', value: dinner },
    { label: 'Other', value: other },
  ];
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visits by Time Range</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
                <span className="text-sm text-slate-600">{item.value} visits</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-[#014D40] h-2 rounded-full transition-all"
                  style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
