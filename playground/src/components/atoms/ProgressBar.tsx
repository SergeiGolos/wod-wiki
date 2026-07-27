import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  /** Completed steps. */
  value: number;
  /** Total steps. */
  max: number;
  /** Optional label shown above the bar. */
  label?: string;
  className?: string;
}

/**
 * ProgressBar — minimal, dependency-free progress indicator.
 *
 * ADR-0010 (Goal Gradient): renders the onboarding gradient using existing
 * brand tokens. Accessible via the native `progressbar` role.
 */
export function ProgressBar({ value, max, label, className }: ProgressBarProps) {
  const safeMax = Math.max(1, max);
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const pct = Math.round((clamped / safeMax) * 100);

  // Pulse on step advance (wayfinder #666, per #664 grill): when `clamped`
  // moves upward (NOT on first mount, NOT on decrement), flash the filled
  // portion to `bg-brand-deep` for ~200ms, then settle back to `bg-brand`.
  // The className swap is instant (no fade); the brief duration produces
  // a flash. Width transition is unchanged (500ms ease-out, layered
  // orthogonally).
  const prevRef = useRef(clamped);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (clamped > prevRef.current) {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 200);
      prevRef.current = clamped;
      return () => clearTimeout(t);
    }
    prevRef.current = clamped;
  }, [clamped]);

  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-deep dark:text-brand-light">
          <span>{label}</span>
          <span className="tabular-nums text-muted-foreground">
            {clamped}/{safeMax}
          </span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={label ?? 'Progress'}
        className="h-2 w-full overflow-hidden rounded-pill bg-brand/10"
      >
        <div
          className={cn(
            'h-full rounded-pill transition-[width] duration-500 ease-out',
            pulsing ? 'bg-brand-deep' : 'bg-brand',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
