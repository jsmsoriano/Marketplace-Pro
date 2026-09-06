import { ArrowDownRight, ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Direction } from '@/lib/analytics';

export function TrendBadge({ direction }: { direction: Direction }) {
  const config = {
    Rising: { icon: ArrowUpRight, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
    Steady: { icon: ArrowRight, className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
    Cooling: { icon: ArrowDownRight, className: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
    'New signal': { icon: Sparkles, className: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' },
  }[direction];
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold', config.className)}>
      <Icon className="h-3 w-3" /> {direction}
    </span>
  );
}
