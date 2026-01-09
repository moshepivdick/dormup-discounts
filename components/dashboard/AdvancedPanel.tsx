import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type DiscountUse = {
  id: number;
  generatedCode: string;
  status: string;
  createdAt: string | Date;
  confirmedAt: string | Date | null;
  profiles?: { email: string; first_name: string | null } | null;
};

type UserActivity = {
  [userId: string]: {
    generated: number;
    verified: number;
    email?: string;
    name?: string;
  };
};

type AdvancedPanelProps = {
  allDiscountUses: DiscountUse[];
  userQrCounts: UserActivity;
  userViewCounts: Record<string, number>;
};

export function AdvancedPanel({
  allDiscountUses,
  userQrCounts,
  userViewCounts,
}: AdvancedPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Advanced (Internal)</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setIsOpen(true)}>
            Show Advanced Panel
          </Button>
          <p className="text-xs text-slate-500 mt-2">
            Contains raw QR codes, user emails, and debug information.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Advanced (Internal)</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            Hide
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Raw QR Codes */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Raw QR Codes</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allDiscountUses.map((code) => (
              <div
                key={code.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs"
              >
                <div>
                  <p className="font-mono font-semibold">{code.generatedCode}</p>
                  <p className="text-slate-500">ID: {code.id}</p>
                </div>
                <Badge>{code.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* User Activity Table */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">User Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-right p-2">Generated</th>
                  <th className="text-right p-2">Verified</th>
                  <th className="text-right p-2">Views</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(userQrCounts).map(([userId, counts]) => (
                  <tr key={userId} className="border-b border-slate-100">
                    <td className="p-2">{counts.email || 'N/A'}</td>
                    <td className="p-2">{counts.name || 'N/A'}</td>
                    <td className="p-2 text-right">{counts.generated}</td>
                    <td className="p-2 text-right">{counts.verified}</td>
                    <td className="p-2 text-right">{userViewCounts[userId] || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
