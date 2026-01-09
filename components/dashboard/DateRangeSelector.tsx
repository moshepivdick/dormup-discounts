import { Button } from '@/components/ui/button';

type DateRange = '7d' | '30d' | '90d' | 'all';

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
    <div className="flex gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(option.value)}
          className="min-w-[80px]"
        >
          {option.label}
        </Button>
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
