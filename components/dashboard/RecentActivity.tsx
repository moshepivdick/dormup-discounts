import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type DiscountUse = {
  id: number;
  generatedCode: string;
  status: string;
  createdAt: string | Date;
  confirmedAt: string | Date | null;
};

type RecentActivityProps = {
  recentCodes: DiscountUse[];
};

export function RecentActivity({ recentCodes }: RecentActivityProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      confirmed: { label: 'Confirmed', className: 'bg-emerald-100 text-emerald-700' },
      cancelled: { label: 'Cancelled', className: 'bg-rose-100 text-rose-700' },
      generated: { label: 'Generated', className: 'bg-amber-100 text-amber-700' },
      expired: { label: 'Expired', className: 'bg-slate-100 text-slate-700' },
    };
    const statusInfo = statusMap[status.toLowerCase()] || statusMap.generated;
    return (
      <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Discount Activity</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Hide' : 'View'} advanced
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {recentCodes.length === 0 ? (
            <p className="text-slate-600 text-center py-4">No discount activity yet</p>
          ) : (
            recentCodes.slice(0, showAdvanced ? recentCodes.length : 20).map((code) => (
              <div
                key={code.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
              >
                <div className="flex-1">
                  {showAdvanced && (
                    <p className="font-mono text-xs text-slate-500 mb-1">ID: {code.id}</p>
                  )}
                  <div className="flex items-center gap-2">
                    {getStatusBadge(code.status)}
                    <span className="text-xs text-slate-500">
                      {new Date(code.confirmedAt || code.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
