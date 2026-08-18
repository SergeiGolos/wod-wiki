import { useCallback, useEffect, useState } from 'react';
import { cn } from '../utils/cn';
import { parseQuery } from '@bitcobblers/wod-wiki-engine';
import type { AnalyticsQueryDef } from './useAnalyticsQueries';
import type { StorageLike } from '../contracts/storage';

export const ANALYTICS_UNIT_STORAGE_KEY = 'wod.analytics.unit';
export const DEFAULT_ANALYTICS_UNIT = 'kg';
export type AnalyticsUnit = 'kg' | 'lb';

const VALID_UNITS: readonly AnalyticsUnit[] = ['kg', 'lb'];

const memoryStore = new Map<string, string>();
const inMemoryStorage: StorageLike = {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memoryStore.set(key, value);
  },
  removeItem: (key: string) => {
    memoryStore.delete(key);
  },
};

const unitListeners = new Set<() => void>();
function notifyUnitChange() {
  for (const l of unitListeners) l();
}

function resolveStorage(custom?: StorageLike): StorageLike {
  return custom ?? inMemoryStorage;
}

export function readStoredUnit(storage?: StorageLike): AnalyticsUnit {
  const store = resolveStorage(storage);
  const stored = store.getItem(ANALYTICS_UNIT_STORAGE_KEY);
  return (VALID_UNITS as readonly string[]).includes(stored ?? '')
    ? (stored as AnalyticsUnit)
    : DEFAULT_ANALYTICS_UNIT;
}

export function useAnalyticsUnitPreference(customStorage?: StorageLike) {
  const storage = resolveStorage(customStorage);
  const [unit, setUnitState] = useState<AnalyticsUnit>(() => readStoredUnit(storage));

  useEffect(() => {
    setUnitState(readStoredUnit(storage));
    const sync = () => setUnitState(readStoredUnit(storage));
    unitListeners.add(sync);
    return () => {
      unitListeners.delete(sync);
    };
  }, [storage]);

  const setUnit = useCallback(
    (next: AnalyticsUnit) => {
      storage.setItem(ANALYTICS_UNIT_STORAGE_KEY, next);
      setUnitState(next);
      notifyUnitChange();
    },
    [storage],
  );

  const toggleUnit = useCallback(() => {
    const next: AnalyticsUnit = unit === 'kg' ? 'lb' : 'kg';
    setUnit(next);
  }, [unit, setUnit]);

  return { unit, setUnit, toggleUnit };
}

export function getEffectiveAnalyticsUnit(
  query: string,
  preferredUnit: AnalyticsUnit,
): { unit: AnalyticsUnit; forced: boolean } {
  const parsed = parseQuery(query);
  const displayUnit = 'displayUnit' in parsed ? (parsed as any).displayUnit : undefined;
  if (displayUnit === 'lb' || displayUnit === 'kg') {
    return { unit: displayUnit as AnalyticsUnit, forced: true };
  }
  return { unit: preferredUnit, forced: false };
}

export function getDashboardEffectiveUnit(
  queries: AnalyticsQueryDef[],
  preferredUnit: AnalyticsUnit,
): { unit: AnalyticsUnit; forced: boolean } {
  const units = queries
    .map((q) => {
      const parsed = parseQuery(q.query);
      return 'displayUnit' in parsed ? (parsed as any).displayUnit : undefined;
    })
    .filter((u): u is string => u === 'kg' || u === 'lb');

  const unique = Array.from(new Set(units));
  if (unique.length === 1) {
    return { unit: unique[0] as AnalyticsUnit, forced: true };
  }
  return { unit: preferredUnit, forced: false };
}
export interface AnalyticsUnitPreferenceProps {
  className?: string;
  unit?: AnalyticsUnit;
  forced?: boolean;
  storage?: StorageLike;
}

export function AnalyticsUnitPreference({ className, unit: unitProp, forced = false, storage }: AnalyticsUnitPreferenceProps) {
  const { unit: storedUnit, setUnit } = useAnalyticsUnitPreference(storage);
  const activeUnit = unitProp ?? storedUnit;

  return (
    <div
      data-testid="analytics-unit-preference"
      className={cn('inline-flex items-center gap-1 text-xs', className)}
    >
      <div
        className={cn(
          'inline-flex items-center rounded-lg border border-border bg-card p-1',
          forced && 'opacity-70',
        )}
        title={forced ? 'Unit forced by query directive in this view' : 'Display unit preference'}
      >
        <button
          type="button"
          disabled={forced}
          onClick={() => setUnit('kg')}
          className={cn(
            'px-2.5 py-1 rounded-md transition-colors text-xs font-mono',
            activeUnit === 'kg'
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            forced && 'cursor-default hover:bg-transparent hover:text-muted-foreground',
          )}
        >
          kg
        </button>
        <button
          type="button"
          disabled={forced}
          onClick={() => setUnit('lb')}
          className={cn(
            'px-2.5 py-1 rounded-md transition-colors text-xs font-mono',
            activeUnit === 'lb'
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            forced && 'cursor-default hover:bg-transparent hover:text-muted-foreground',
          )}
        >
          lb
        </button>
      </div>
      {forced && (
        <span className="text-[11px] text-muted-foreground italic">forced by note</span>
      )}
    </div>
  );
}
