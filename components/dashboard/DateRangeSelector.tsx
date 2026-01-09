import { cn } from '@/lib/utils';

type DateRange = '7d' | '30d' | '90d' | 'all';

export type { DateRange };

type DateRangeSelectorProps = {
  value: DateRange;
  onChange: (range: DateRange) => void;
};

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const options: { value: DateRange; label: string }[] = [
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
    { value: '90d', label: '90d' },
    { value: 'all', label: 'All time' },
  ];

  return (
    <div className="inline-flex rounded-2xl bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'px-4 py-1.5 text-sm font-medium rounded-xl transition-all',
            value === option.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function getDateRangeDates(range: DateRange): { startDate?: Date; endDate?: Date } {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  if (range === 'all') {
    return {};
  }

  const startDate = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
}
