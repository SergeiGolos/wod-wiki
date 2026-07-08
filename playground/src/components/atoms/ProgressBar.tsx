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
          className="h-full rounded-pill bg-brand transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
