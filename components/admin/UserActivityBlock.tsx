'use client';

type UserActivityOverview = {
  dau: number;
  wau: number;
  mau: number;
  newUsersToday: number;
  newUsersWeek: number;
  returningPercentage: number;
  avgDiscountsPerUser: number;
};

type MicroInsights = {
  peakActivityTime: string;
  mostActiveDay: string;
  topCohort: string;
};

type Props = {
  activity: UserActivityOverview;
  insights: MicroInsights;
};

export function UserActivityBlock({ activity, insights }: Props) {
  return (
    <div className="space-y-6">
      {/* Main metrics grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-inner shadow-black/40">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">DAU</p>
          <p className="mt-2 text-3xl font-semibold">{activity.dau}</p>
          <p className="text-xs text-white/60">Daily Active Users</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-inner shadow-black/40">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">WAU</p>
          <p className="mt-2 text-3xl font-semibold">{activity.wau}</p>
          <p className="text-xs text-white/60">Weekly Active Users</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-inner shadow-black/40">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">MAU</p>
          <p className="mt-2 text-3xl font-semibold">{activity.mau}</p>
          <p className="text-xs text-white/60">Monthly Active Users</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-inner shadow-black/40">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Returning</p>
          <p className="mt-2 text-3xl font-semibold">{activity.returningPercentage}%</p>
          <p className="text-xs text-white/60">Users retention</p>
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-inner shadow-black/40">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">New Users</p>
          <p className="mt-2 text-2xl font-semibold">{activity.newUsersToday}</p>
          <p className="text-xs text-white/60">Today</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-inner shadow-black/40">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">New Users</p>
          <p className="mt-2 text-2xl font-semibold">{activity.newUsersWeek}</p>
          <p className="text-xs text-white/60">This Week</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-inner shadow-black/40">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Avg Discounts</p>
          <p className="mt-2 text-2xl font-semibold">{activity.avgDiscountsPerUser}</p>
          <p className="text-xs text-white/60">Per user (7d)</p>
        </div>
      </div>

      {/* Micro-insights */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-inner shadow-black/40">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Micro-Insights</h3>
        <div className="space-y-2 text-sm text-white/70">
          <div className="flex items-center justify-between">
            <span className="text-white/60">Peak activity time:</span>
            <span className="font-medium">{insights.peakActivityTime}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Most active day:</span>
            <span className="font-medium">{insights.mostActiveDay}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Top cohort:</span>
            <span className="font-medium">{insights.topCohort}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
