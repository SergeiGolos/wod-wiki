import { useState } from 'react';
import { cn } from '../utils/cn';

export type AnalyticsRangeWeeks = 4 | 8 | 16;

export interface RangeSelectorProps {
  weeks?: number;
  onWeeksChange?: (weeks: number) => void;
  className?: string;
}

export function RangeSelector({ weeks: weeksProp, onWeeksChange, className }: RangeSelectorProps) {
  const [internalWeeks, setInternalWeeks] = useState<number>(16);
  const currentWeeks = weeksProp ?? internalWeeks;

  const handleSelect = (w: number) => {
    if (onWeeksChange) {
      onWeeksChange(w);
    } else {
      setInternalWeeks(w);
    }
  };

  return (
    <div className={cn('inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1', className)}>
      {[4, 8, 16].map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => handleSelect(w)}
          className={cn(
            'text-xs px-2.5 py-1 rounded-md transition-colors',
            currentWeeks === w
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
