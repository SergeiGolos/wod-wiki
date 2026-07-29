import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export const ANALYTICS_UNIT_STORAGE_KEY = 'wod.analytics.unit';
export const DEFAULT_ANALYTICS_UNIT = 'kg';
export type AnalyticsUnit = 'kg' | 'lb';

const VALID_UNITS: readonly AnalyticsUnit[] = ['kg', 'lb'];

function readStoredUnit(): AnalyticsUnit {
  if (typeof window === 'undefined') return DEFAULT_ANALYTICS_UNIT;
  const stored = window.localStorage.getItem(ANALYTICS_UNIT_STORAGE_KEY);
  return (VALID_UNITS as readonly string[]).includes(stored ?? '')
    ? (stored as AnalyticsUnit)
    : DEFAULT_ANALYTICS_UNIT;
}

/**
 * Read/write the analytics display-unit preference (kg or lb).
 * Syncs across tabs via the `storage` event.
 */
export function useAnalyticsUnitPreference() {
  const [unit, setUnitState] = useState<AnalyticsUnit>(readStoredUnit);

  const setUnit = useCallback((next: AnalyticsUnit) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ANALYTICS_UNIT_STORAGE_KEY, next);
    setUnitState(next);
    window.dispatchEvent(
      new StorageEvent('storage', { key: ANALYTICS_UNIT_STORAGE_KEY, newValue: next }),
    );
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      if (e.key !== ANALYTICS_UNIT_STORAGE_KEY) return;
      const next = (VALID_UNITS as readonly string[]).includes(e.newValue ?? '')
        ? (e.newValue as AnalyticsUnit)
        : DEFAULT_ANALYTICS_UNIT;
      setUnitState(next);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return { unit, setUnit };
}

export interface AnalyticsUnitPreferenceProps {
  className?: string;
}

export function AnalyticsUnitPreference({ className }: AnalyticsUnitPreferenceProps) {
  const { unit, setUnit } = useAnalyticsUnitPreference();
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1',
        className,
      )}
    >
      {VALID_UNITS.map((u) => (
        <button
          key={u}
          onClick={() => setUnit(u)}
          className={cn(
            'text-xs px-2.5 py-1 rounded-md transition-colors uppercase',
            unit === u
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          {u}
        </button>
      ))}
    </div>
  );
}
