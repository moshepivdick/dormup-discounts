type Props = {
  title: string;
  value: string | number;
  subtext?: string;
};

export function StatsCard({ title, value, subtext }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-inner shadow-black/40">
      <p className="text-xs uppercase tracking-[0.2em] text-white/60">{title}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      {subtext && <p className="text-xs text-white/60">{subtext}</p>}
    </div>
  );
}

