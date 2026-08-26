/**
 * homeAnalyticsData.ts — the WQL queries behind the home analytics showcase
 * and the illustrative sample `QueryResult`s they fall back to.
 *
 * The home analytics section executes these queries against the live
 * IndexedDB store (via `useAnalyticsQueries`), exactly like `DashboardView`.
 * When the store is empty (Storybook, or a fresh journal), each widget falls
 * back to the matching sample result below so the showcase never renders
 * blank — the sample data *is* the WQL vocabulary taught by example.
 */
import type { QueryResult } from '@bitcobblers/wod-wiki-engine';

/** A named WQL query backing one showcase widget. */
export interface AnalyticsQueryDef {
  key: string;
  query: string;
}

const NOW = 1_700_000_000_000;
const WEEK = 604_800_000;
const ts = (weeksAgo: number) => NOW - weeksAgo * WEEK;

/** The six showcase widgets, keyed for live execution. */
export const HOME_ANALYTICS_QUERIES: AnalyticsQueryDef[] = [
  { key: 'repsByEffort', query: 'sum:totalReps{} by {effort} last 6w' },
  { key: 'weeklyVolume', query: 'sum:totalVolume{} by {week}.rollup(1w) last 6w' },
  { key: 'loadByIntensity', query: 'sum:sessionLoad{} by {intensity}.rollup(1w) last 6w' },
  { key: 'volumeByEffort', query: 'sum:totalVolume{discipline:strength} by {effort} last 6w' },
  { key: 'avgTis', query: 'avg:tis{} last 6w' },
  { key: 'totalVolume', query: 'sum:totalVolume{} last 6w' },
];

export interface HomeAnalyticsData {
  repsByEffort: QueryResult;
  weeklyVolume: QueryResult;
  loadByIntensity: QueryResult;
  volumeByEffort: QueryResult;
  avgTis: QueryResult;
  totalVolume: QueryResult;
}

/** Reps by effort — grouped bars → table list. */
const repsByEffort: QueryResult = {
  parsed: { family: 'aggregate', raw: 'sum:totalReps{} by {effort} last 6w', agg: 'sum', metric: 'totalReps', filters: [], groupBy: ['effort'], window: { kind: 'relative', size: 6, unit: 'w' } },
  series: [
    { key: 'thruster', label: 'Thruster', points: [{ ts: ts(0), value: 180 }] },
    { key: 'pull-up', label: 'Pull-up', points: [{ ts: ts(0), value: 120 }] },
    { key: 'burpee', label: 'Burpee', points: [{ ts: ts(0), value: 90 }] },
    { key: 'double-under', label: 'Double Under', points: [{ ts: ts(0), value: 150 }] },
    { key: 'box-jump', label: 'Box Jump', points: [{ ts: ts(0), value: 60 }] },
  ],
  stages: { selected: 5, buckets: 1, aggregated: 5, groups: 5 },
  matched: [],
};

/** Weekly tonnage — timeseries. */
const weeklyVolume: QueryResult = {
  parsed: {
    family: 'aggregate',
    raw: 'sum:totalVolume{} by {week}.rollup(1w) last 6w',
    agg: 'sum', metric: 'totalVolume', filters: [], groupBy: ['week'], rollup: { size: 1, unit: 'w' }, window: { kind: 'relative', size: 6, unit: 'w' },
  },
  series: [{
    key: 'totalVolume', label: 'Total volume',
    points: [
      { ts: ts(5), value: 3200 }, { ts: ts(4), value: 4100 }, { ts: ts(3), value: 3800 },
      { ts: ts(2), value: 5200 }, { ts: ts(1), value: 4700 }, { ts: ts(0), value: 6100 },
    ],
  }],
  stages: { selected: 6, buckets: 6, aggregated: 6, groups: 1 },
  matched: [],
};

/** Load by intensity — stacked bar (3 series × 4 weeks). */
const loadByIntensity: QueryResult = {
  parsed: {
    family: 'aggregate',
    raw: 'sum:sessionLoad{} by {intensity}.rollup(1w) last 6w',
    agg: 'sum', metric: 'sessionLoad', filters: [], groupBy: ['intensity'], rollup: { size: 1, unit: 'w' }, window: { kind: 'relative', size: 6, unit: 'w' },
  },
  series: [
    { key: 'low', label: 'low', points: [{ ts: ts(3), value: 120 }, { ts: ts(2), value: 140 }, { ts: ts(1), value: 110 }, { ts: ts(0), value: 160 }] },
    { key: 'moderate', label: 'moderate', points: [{ ts: ts(3), value: 220 }, { ts: ts(2), value: 200 }, { ts: ts(1), value: 260 }, { ts: ts(0), value: 230 }] },
    { key: 'high', label: 'high', points: [{ ts: ts(3), value: 320 }, { ts: ts(2), value: 380 }, { ts: ts(1), value: 340 }, { ts: ts(0), value: 410 }] },
  ],
  stages: { selected: 12, buckets: 4, aggregated: 12, groups: 3 },
  matched: [],
};

/** Volume by effort — toplist. */
const volumeByEffort: QueryResult = {
  parsed: {
    family: 'aggregate',
    raw: 'sum:totalVolume{discipline:strength} by {effort} last 6w',
    agg: 'sum', metric: 'totalVolume',
    filters: [{ key: 'discipline', negate: false, values: [{ value: 'strength', wildcard: false }] }],
    groupBy: ['effort'],
    window: { kind: 'relative', size: 6, unit: 'w' },
  },
  series: [
    { key: 'back-squat', label: 'Back Squat', points: [{ ts: ts(0), value: 5400 }] },
    { key: 'deadlift', label: 'Deadlift', points: [{ ts: ts(0), value: 4800 }] },
    { key: 'bench-press', label: 'Bench Press', points: [{ ts: ts(0), value: 3600 }] },
    { key: 'press', label: 'Press', points: [{ ts: ts(0), value: 2900 }] },
  ],
  stages: { selected: 4, buckets: 1, aggregated: 4, groups: 4 },
  matched: [],
};

/** Avg TIS — scalar. */
const avgTis: QueryResult = {
  parsed: { family: 'aggregate', raw: 'avg:tis{} last 6w', agg: 'avg', metric: 'tis', filters: [], groupBy: [], window: { kind: 'relative', size: 6, unit: 'w' } },
  series: [{ key: 'tis', label: 'TIS', points: [{ ts: ts(0), value: 7.8 }] }],
  stages: { selected: 1, buckets: 1, aggregated: 1, groups: 1 },
  matched: [],
  scalar: 7.8,
};

/** Total volume — scalar. */
const totalVolume: QueryResult = {
  parsed: { family: 'aggregate', raw: 'sum:totalVolume{} last 6w', agg: 'sum', metric: 'totalVolume', filters: [], groupBy: [], window: { kind: 'relative', size: 6, unit: 'w' } },
  series: [{ key: 'totalVolume', label: 'Total volume', points: [{ ts: ts(0), value: 27100 }] }],
  stages: { selected: 1, buckets: 1, aggregated: 1, groups: 1 },
  matched: [],
  scalar: 27100,
};

/** The illustrative fallback set — the WQL vocabulary taught by example. */
export const SAMPLE_HOME_ANALYTICS: HomeAnalyticsData = {
  repsByEffort,
  weeklyVolume,
  loadByIntensity,
  volumeByEffort,
  avgTis,
  totalVolume,
};

/** True when a live result actually carries points (else fall back to sample). */
export const hasPoints = (r: QueryResult | undefined): r is QueryResult =>
  !!r && r.series.some((s) => s.points.length > 0);
