/**
 * storeRollup — store-scope composed calculations, eager at workout
 * finalize (#877). Replaces the lazy rollupDriver: ACWR / monotony / strain
 * are now registered store-scope calcs (STORE_CALCS) evaluated by the
 * composed engine over Analytics Store facts, publishing per-point
 * `grain: 'rollup'` rows under `calc.*` keys.
 *
 * Row identity is unchanged (`rollup:<metricKey>:<day>`, timestamp
 * `day * DAY`), so the cutover reconciles in place: rows the new engine
 * reproduces bit-identically are left untouched, stale rows are deleted.
 *
 * WQL atoms (`sum:sessionLoad{} by {day}`) resolve directly against the
 * fact store with workloadRollup's LOCAL dayBucket — parity-pinned (#864);
 * QueryService's UTC bucketing is a known divergence this layer must not
 * inherit. Full QueryService execution for user-authored store calcs is a
 * follow-up.
 */

import type { AnalyticsDataPoint } from '@/types/storage';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { evaluate } from '@/core/analytics/calc/evaluator';
import { LookupRegistry } from '@/core/analytics/calc/lookup';
import { CalculationRegistry } from '@/core/analytics/calc/registry';
import { STORE_CALCS } from '@/core/analytics/calc/seeds';
import type { CalculationDefinition } from '@/core/analytics/calc/types';
import type { ExprNode } from '@/core/analytics/calc/ast';
import { DIM_ZERO } from '@/core/analytics/calc/dimensions';
import { ABSENT, truthy, Val } from '@/core/analytics/calc/values';
import { DAY, dayBucket } from './workloadRollup';

/** Store surface the rollup evaluation needs — injectable for tests. */
export interface StoreRollupStore {
  getFactsByMetric(metricKey: string): Promise<AnalyticsDataPoint[]>;
  saveAnalyticsPoints(points: AnalyticsDataPoint[]): Promise<void>;
  deleteAnalyticsPoints(ids: string[]): Promise<void>;
}

const indexedDbRollupStore: StoreRollupStore = {
  getFactsByMetric: (metricKey) => indexedDBService.getFactsByMetric(metricKey),
  saveAnalyticsPoints: (points) => indexedDBService.saveAnalyticsPoints(points),
  deleteAnalyticsPoints: (ids) => indexedDBService.deleteAnalyticsPoints(ids),
};

export interface StoreRollupOptions {
  /** Canonical "now" — injectable for deterministic tests. */
  now?: number;
}

export interface StoreRollupSummary {
  /** Day bucket the windows were computed through. */
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

/** Deterministic rollup fact id — recompute lands on the same row. */
export function rollupFactId(metricKey: string, day: number): string {
  return `rollup:${metricKey}:${day}`;
}

/** Every WQL selection in the store calcs (pre-fetch set), keyed distinctly
 *  by metric + filters + aggregator. */
function wqlSelections(defs: CalculationDefinition[]): Extract<ExprNode, { kind: 'wql' }>[] {
  const selections = new Map<string, Extract<ExprNode, { kind: 'wql' }>>();
  const walk = (node: ExprNode): void => {
    if (node.kind === 'wql') selections.set(`${node.metric}|${node.filters ?? ''}|${node.aggregator}`, node);
    if (node.kind === 'call') node.args.forEach(walk);
    if (node.kind === 'binary') {
      walk(node.left);
      walk(node.right);
    }
    if (node.kind === 'unary') walk(node.arg);
  };
  for (const def of defs) {
    for (const variant of def.variants) {
      for (const node of Object.values(variant.nodes)) {
        if (node.ast) walk(node.ast);
      }
    }
  }
  return [...selections.values()];
}

/** Minimal `key:value` filter over fact rows (discipline/effort/grain/origin).
 *  Seed WQL filters are a raw brace string (`discipline:running,effort:run`); 
 *  comma-separated, ANDed, single-value per key. */
function matchesSelectionFilters(fact: AnalyticsDataPoint, filters: string | undefined): boolean {
  if (!filters) return true;
  for (const clause of filters.split(',')) {
    const [key, value] = clause.split(':').map((s) => s.trim());
    if (!key || !value) continue;
    const actual =
      key === 'discipline' ? fact.discipline
      : key === 'effort' ? fact.effortSlug
      : key === 'grain' ? fact.grain
      : key === 'origin' ? fact.origin
      : undefined;
    if (actual !== value) return false;
  }
  return true;
}

/**
 * Resolve a WQL selection to a series: facts for the metric (excluding rollup
 * rows, filtered by the selection's braces), aggregated into LOCAL day
 * buckets (sum by default; count for count: selections), domain zero-filled
 * from the first load day through `throughDay` so trailing windows decay
 * exactly like the reference math.
 */
function selectionToSeries(facts: AnalyticsDataPoint[], throughDay: number, wql?: { aggregator?: string; filters?: string }): Val {
  const loads = new Map<number, number>();
  for (const fact of facts) {
    if (fact.grain === 'rollup' || typeof fact.value !== 'number') continue;
    if (!matchesSelectionFilters(fact, wql?.filters)) continue;
    const day = dayBucket(fact.timestamp);
    const contribution = wql?.aggregator === 'count' ? 1 : fact.value;
    loads.set(day, (loads.get(day) ?? 0) + contribution);
  }
  if (loads.size === 0) return { kind: 'series', points: new Map(), dim: DIM_ZERO, unit: 'AU' };
  const firstDay = Math.min(...loads.keys());
  const points = new Map<number, number>();
  for (let day = firstDay; day <= throughDay; day++) points.set(day, loads.get(day) ?? 0);
  return { kind: 'series', points, dim: DIM_ZERO, unit: 'AU' };
}

/**
 * Evaluate all store-scope calcs over the fact store and reconcile the
 * `grain: 'rollup'` rows: write missing/stale windows, delete rows whose
 * windows stopped producing values, leave unchanged rows untouched.
 */
export async function runStoreRollup(
  store: StoreRollupStore = indexedDbRollupStore,
  options: StoreRollupOptions = {},
): Promise<StoreRollupSummary> {
  const now = options.now ?? Date.now();
  const throughDay = dayBucket(now);

  const registry = new CalculationRegistry(new LookupRegistry());
  const defs = STORE_CALCS;
  for (const def of defs) registry.register(def);

  // Pre-fetch every WQL selection's facts, then evaluate synchronously.
  const seriesBySelection = new Map<string, Val>();
  for (const sel of wqlSelections(defs)) {
    seriesBySelection.set(
      `${sel.metric}|${sel.filters ?? ''}|${sel.aggregator}`,
      selectionToSeries(await store.getFactsByMetric(sel.metric), throughDay, sel),
    );
  }

  const desired: AnalyticsDataPoint[] = [];
  const daysWithValues = new Set<number>();
  for (const def of registry.byScope('store')) {
    // First applicable variant wins (variants are priority-sorted at
    // registration); missing data in a predicate reads as false.
    for (const variant of def.variants) {
      const memo = new Map<string, Val>();
      const resolveNode = (nodeId: string): Val => {
        const cached = memo.get(nodeId);
        if (cached) return cached;
        const node = variant.nodes[nodeId];
        if (!node?.ast) return ABSENT;
        const value = evaluate(node.ast, {
          resolveRef: (name) => resolveNode(name),
          resolveWql: (wql) => seriesBySelection.get(`${wql.metric}|${wql.filters ?? ''}|${wql.aggregator}`) ?? ABSENT,
        });
        memo.set(nodeId, value);
        return value;
      };
      const ctx = {
        resolveRef: (name: string) => resolveNode(name),
        resolveWql: (wql: Extract<ExprNode, { kind: 'wql' }>) => seriesBySelection.get(`${wql.metric}|${wql.filters ?? ''}|${wql.aggregator}`) ?? ABSENT,
      };
      if (variant.whenAst && !truthy(evaluate(variant.whenAst, ctx))) continue;

      const nodeId = Array.isArray(def.output?.nodeId) ? def.output?.nodeId[0] : def.output?.nodeId;
      if (!nodeId) break;
      const output = resolveNode(nodeId);
      if (output.kind !== 'series') break;

      const key = def.output?.key ?? def.id;
      const label = def.output?.label ?? key;
      const unit = def.output?.unit ?? output.unit;
      for (const [day, value] of output.points) {
        daysWithValues.add(day);
        desired.push({
          id: rollupFactId(key, day),
          noteId: '',
          grain: 'rollup',
          segmentId: '',
          segmentVersion: 0,
          resultId: '',
          type: key,
          value,
          unit,
          label,
          metricKey: key,
          metricLabel: label,
          metricUnit: unit,
          timestamp: day * DAY,
          createdAt: now,
        });
      }
      break;
    }
  }

  const desiredIds = new Set(desired.map((row) => row.id));
  const metricKeys = defs.map((def) => def.output?.key ?? def.id);
  const existing = (await Promise.all(metricKeys.map((key) => store.getFactsByMetric(key)))).flat();

  const writes: AnalyticsDataPoint[] = [];
  for (const row of desired) {
    const current = existing.find((e) => e.id === row.id);
    if (!current || current.value !== row.value) writes.push(row);
  }
  const deletions = existing.filter((row) => !desiredIds.has(row.id)).map((row) => row.id);

  if (writes.length > 0) await store.saveAnalyticsPoints(writes);
  if (deletions.length > 0) await store.deleteAnalyticsPoints(deletions);

  return {
    throughDay,
    days: daysWithValues.size,
    facts: desired.length,
    written: writes.length,
    deleted: deletions.length,
  };
}

let inFlight: Promise<StoreRollupSummary> | null = null;

/**
 * Analytics-surface open hook and eager-at-finalize entry point: recompute
 * store-scope rollups against the real store, deduped across concurrent
 * callers. Failures are disposable — facts recompute on the next run.
 */
export function ensureStoreRollupFacts(): Promise<StoreRollupSummary> {
  inFlight ??= runStoreRollup().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
