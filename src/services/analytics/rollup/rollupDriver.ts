/**
 * rollupDriver — the lazy rollup driver (CONTEXT.md 'Rollup Fact'). On
 * analytics-surface open it reads SessionLoad summary facts, computes the
 * Foster workload windows (workloadRollup.ts), and persists them as
 * `grain: 'rollup'` fact rows in the Analytics Store so widgets stay dumb
 * WQL queries (`avg:calc.acwr{}`, `{grain:rollup}`, …).
 *
 * Idempotent: rows carry deterministic ids (`rollup:<metricKey>:<day>`), so
 * a run writes only missing/changed rows and deletes rows whose window no
 * longer produces a value (suppressed, or the input facts were removed).
 * Facts are disposable projections (ADR analytics-store-summary-only) —
 * re-derivation from summary facts is always safe.
 *
 * No scheduler: the driver runs only from the analytics-surface open path
 * (`ensureRollupFacts`), never on a timer.
 */

import type { AnalyticsDataPoint } from '@/types/storage';
import { indexedDBService } from '@/services/db/IndexedDBService';
import {
  computeWorkloadRollups,
  dailySessionLoads,
  dayBucket,
  DAY,
  ROLLUP_METRICS,
  type RollupMetricTarget,
} from './workloadRollup';

/** Store surface the rollup driver needs — injectable for tests. */
export interface RollupStore {
  getFactsByMetric(metricKey: string): Promise<AnalyticsDataPoint[]>;
  saveAnalyticsPoints(points: AnalyticsDataPoint[]): Promise<void>;
  deleteAnalyticsPoints(ids: string[]): Promise<void>;
}

const indexedDbRollupStore: RollupStore = {
  getFactsByMetric: (metricKey) => indexedDBService.getFactsByMetric(metricKey),
  saveAnalyticsPoints: (points) => indexedDBService.saveAnalyticsPoints(points),
  deleteAnalyticsPoints: (ids) => indexedDBService.deleteAnalyticsPoints(ids),
};

export interface RollupDriverOptions {
  /** Canonical "now" — injectable for deterministic tests. */
  now?: number;
}

export interface RollupRunSummary {
  /** UTC day bucket the windows were computed through. */
  throughDay: number;
  /** Days that produced at least one value. */
  days: number;
  /** Desired rollup rows after compute. */
  facts: number;
  /** Rows written (missing or value-changed). */
  written: number;
  /** Stale rows deleted (window no longer produces a value). */
  deleted: number;
}

/** Deterministic Rollup Fact id — recompute lands on the same row. */
export function rollupFactId(metricKey: string, day: number): string {
  return `rollup:${metricKey}:${day}`;
}

function toFactRow(target: RollupMetricTarget, day: number, value: number, now: number): AnalyticsDataPoint {
  const def = ROLLUP_METRICS[target];
  return {
    id: rollupFactId(def.metricKey, day),
    noteId: '',
    grain: 'rollup',
    segmentId: '',
    segmentVersion: 0,
    resultId: '',
    type: def.metricKey,
    value,
    unit: def.unit,
    label: def.label,
    metricKey: def.metricKey,
    metricLabel: def.label,
    metricUnit: def.unit,
    timestamp: day * DAY,
    createdAt: now,
  };
}

/**
 * Compute ACWR / monotony / strain from SessionLoad summary facts and
 * reconcile the `grain: 'rollup'` rows in the store: write missing/stale
 * windows, delete rows whose windows stopped producing values, leave
 * unchanged rows untouched (their `createdAt` survives).
 */
export async function runRollupDriver(
  store: RollupStore = indexedDbRollupStore,
  options: RollupDriverOptions = {},
): Promise<RollupRunSummary> {
  const now = options.now ?? Date.now();
  const throughDay = dayBucket(now);

  const sessionFacts = (await store.getFactsByMetric('sessionLoad'))
    .filter((row) => row.grain !== 'rollup' && typeof row.value === 'number');
  const rollups = computeWorkloadRollups(dailySessionLoads(sessionFacts), throughDay);

  const desired: AnalyticsDataPoint[] = [];
  for (const rollup of rollups) {
    if (rollup.acwr !== undefined) desired.push(toFactRow('acwr', rollup.day, rollup.acwr, now));
    if (rollup.monotony !== undefined) desired.push(toFactRow('monotony', rollup.day, rollup.monotony, now));
    if (rollup.strain !== undefined) desired.push(toFactRow('strain', rollup.day, rollup.strain, now));
  }
  const desiredIds = new Set(desired.map((row) => row.id));

  const existing = (
    await Promise.all(Object.values(ROLLUP_METRICS).map((def) => store.getFactsByMetric(def.metricKey)))
  ).flat();
  const existingById = new Map(existing.map((row) => [row.id, row]));

  // Deterministic math ⇒ identical inputs reproduce the stored float exactly,
  // so a strict value compare isolates genuinely stale windows.
  const toWrite = desired.filter((row) => existingById.get(row.id)?.value !== row.value);
  const toDelete = existing.filter((row) => !desiredIds.has(row.id)).map((row) => row.id);

  if (toWrite.length > 0) await store.saveAnalyticsPoints(toWrite);
  if (toDelete.length > 0) await store.deleteAnalyticsPoints(toDelete);

  return { throughDay, days: rollups.length, facts: desired.length, written: toWrite.length, deleted: toDelete.length };
}

let inFlight: Promise<RollupRunSummary> | null = null;

/**
 * Analytics-surface open hook: run the driver against the real store,
 * deduplicating concurrent opens (both surfaces mounting together, React
 * strict-mode double effects). Settled runs clear — the next open recomputes
 * missing/stale windows only.
 */
export function ensureRollupFacts(): Promise<RollupRunSummary> {
  inFlight ??= runRollupDriver().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
