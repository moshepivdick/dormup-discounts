import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DayData = {
  day: number;
  dayName: string;
  views: number;
  confirmed: number;
};

type VisitsByDayOfWeekProps = {
  data: DayData[];
};

export function VisitsByDayOfWeek({ data }: VisitsByDayOfWeekProps) {
  const maxValue = Math.max(...data.map((d) => Math.max(d.views, d.confirmed)), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visits by Day of Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((day) => (
            <div key={day.day}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700">{day.dayName}</span>
                <span className="text-sm text-slate-600">{day.confirmed} visits</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-[#014D40] h-2 rounded-full transition-all"
                  style={{ width: `${maxValue > 0 ? (day.confirmed / maxValue) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
