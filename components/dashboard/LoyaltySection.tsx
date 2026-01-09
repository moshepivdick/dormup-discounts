import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type LoyaltySectionProps = {
  newStudents: number;
  returningStudents: number;
  avgVisitsPerStudent: number;
};

export function LoyaltySection({
  newStudents,
  returningStudents,
  avgVisitsPerStudent,
}: LoyaltySectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loyalty</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-slate-600">New Students</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{newStudents}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Returning Students</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{returningStudents}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Avg Visits per Student</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{avgVisitsPerStudent}</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Students who return are more likely to become regular customers.
        </p>
      </CardContent>
    </Card>
  );
}
