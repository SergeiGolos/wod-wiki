import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { parseQuery } from '@/services/analytics/query';
import type { AnalyticsQueryDef } from './useAnalyticsQueries';

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

/**
 * Determine the effective display unit for a single WQL query.
 *
 * A `kg`/`lb` display directive (`in kg` / `in lb`) overrides the stored
 * preference and is reported as `forced`. All other queries fall back to the
 * shared preference so the unit toggle remains the source of truth.
 */
export function getEffectiveAnalyticsUnit(
  query: string,
  preferredUnit: AnalyticsUnit,
): { unit: AnalyticsUnit; forced: boolean } {
  const parsed = parseQuery(query);
  const directive = parsed.displayUnit;
  if (directive === 'kg' || directive === 'lb') {
    return { unit: directive, forced: true };
  }
  return { unit: preferredUnit, forced: false };
}

/**
 * Determine the effective display unit for a dashboard's widget queries.
 *
 * The directive wins only when every kg/lb directive across the widgets
 * agrees on the same unit; otherwise the shared preference remains the default
 * and individual widgets may still override it per-query.
 */
export function getDashboardEffectiveUnit(
  queries: AnalyticsQueryDef[],
  preferredUnit: AnalyticsUnit,
): { unit: AnalyticsUnit; forced: boolean } {
  const directiveUnits = new Set<AnalyticsUnit>();
  for (const q of queries) {
    const parsed = parseQuery(q.query);
    const directive = parsed.displayUnit;
    if (directive === 'kg' || directive === 'lb') {
      directiveUnits.add(directive);
    }
  }
  if (directiveUnits.size === 1) {
    const [unit] = directiveUnits;
    return { unit: unit!, forced: true };
  }
  return { unit: preferredUnit, forced: false };
}


export interface AnalyticsUnitPreferenceProps {
  className?: string;
  /** Optional unit to display. When omitted the stored preference is used. */
  unit?: AnalyticsUnit;
  /** When true, the unit is dictated by an active query directive and the toggle is disabled. */
  forced?: boolean;
}

export function AnalyticsUnitPreference({ className, unit: unitProp, forced = false }: AnalyticsUnitPreferenceProps) {
  const { unit: storedUnit, setUnit } = useAnalyticsUnitPreference();
  const unit = unitProp ?? storedUnit;
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1',
        className,
      )}
    >
      {forced && (
        <span className="text-[10px] text-muted-foreground px-1.5 whitespace-nowrap">
          unit set by query
        </span>
      )}
      {VALID_UNITS.map((u) => (
        <button
          key={u}
          onClick={() => setUnit(u)}
          disabled={forced}
          className={cn(
            'text-xs px-2.5 py-1 rounded-md transition-colors uppercase',
            unit === u
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            forced && 'opacity-60 cursor-not-allowed',
          )}
        >
          {u}
        </button>
      ))}
    </div>
  );
}
