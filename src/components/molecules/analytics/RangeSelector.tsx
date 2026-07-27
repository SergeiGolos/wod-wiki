import { useQueryState } from 'nuqs';
import { cn } from '@/lib/utils';

export type AnalyticsRangeWeeks = 4 | 8 | 16;

const VALID_WEEKS: readonly number[] = [4, 8, 16];

const parseAsWeeks = {
  parse(value: string): number | null {
    const n = Number.parseInt(value, 10);
    return VALID_WEEKS.includes(n) ? n : null;
  },
  serialize(value: number): string {
    return String(value);
  },
  withDefault(defaultValue: number) {
    return { ...this, defaultValue };
  },
};

export function useAnalyticsRange() {
  return useQueryState('weeks', parseAsWeeks.withDefault(16));
}

export interface RangeSelectorProps {
  className?: string;
}

export function RangeSelector({ className }: RangeSelectorProps) {
  const [weeks, setWeeks] = useAnalyticsRange();

  return (
    <div className={cn('inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1', className)}>
      {[4, 8, 16].map((w) => (
        <button
          key={w}
          onClick={() => setWeeks(w)}
          className={cn(
            'text-xs px-2.5 py-1 rounded-md transition-colors',
            weeks === w
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          {w}w
        </button>
      ))}
    </div>
  );
}
