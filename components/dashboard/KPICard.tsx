import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type KPICardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  highlight?: boolean;
  tooltip?: string;
  hero?: boolean; // Makes card span 2 columns
};

export function KPICard({ title, value, subtitle, highlight, tooltip, hero }: KPICardProps) {
  return (
    <Card className={cn(
      'transition-shadow hover:shadow-lg border-0 shadow-sm',
      hero && 'md:col-span-2'
    )}>
      <CardContent className="p-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm font-medium text-slate-600">{title}</p>
              {tooltip && (
                <div className="group relative">
                  <div className="w-4 h-4 rounded-full bg-slate-300 text-slate-600 text-xs flex items-center justify-center cursor-help">
                    i
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-slate-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap">
                      {tooltip}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className={cn(
              'text-4xl font-semibold',
              highlight ? 'text-[#014D40]' : 'text-slate-900'
            )}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
