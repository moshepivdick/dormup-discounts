'use client';

type Alert = {
  type: 'warning' | 'critical';
  message: string;
  id: string;
};

type Props = {
  alerts: Alert[];
};

export function AlertsBlock({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-semibold">All systems operational</span>
        </div>
      </div>
    );
  }

  const criticalAlerts = alerts.filter(a => a.type === 'critical');
  const warningAlerts = alerts.filter(a => a.type === 'warning');

  return (
    <div className="space-y-3">
      {criticalAlerts.map((alert) => (
        <div
          key={alert.id}
          className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 shadow-lg shadow-red-500/10"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-red-400">Critical Alert</p>
              <p className="mt-1 text-sm text-red-300/90">{alert.message}</p>
            </div>
          </div>
        </div>
      ))}

      {warningAlerts.map((alert) => (
        <div
          key={alert.id}
          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-400">Warning</p>
              <p className="mt-1 text-sm text-amber-300/90">{alert.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
