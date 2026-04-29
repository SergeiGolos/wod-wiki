/**
 * Mock fixtures for WodBlockInspector stories.
 *
 * These represent what the runtime would dispatch across the pipeline.
 * Useful for testing display states without wiring real engines.
 */

import type { MetricSpan, MetricEntry } from '../../../src/runtime-test-bench/types/inspector';

// ─── Shared IDs ───────────────────────────────────────────────────────────────

export const IDS = {
  // Compile
  parser_line1:   'span-parser-1',
  dialect_line1:  'span-dialect-1',
  parser_line2:   'span-parser-2',
  dialect_line2:  'span-dialect-2',
  // Plan
  plan_volume:    'span-plan-volume',
  plan_fatigue:   'span-plan-fatigue',
  // Runtime block 1 (bench press)
  compiler_b1:    'span-compiler-b1',
  runtime_b1:     'span-runtime-b1',
  proc_b1:        'span-proc-b1',
  collected_b1:   'span-collected-b1',
  // Runtime block 2 (rows)
  compiler_b2:    'span-compiler-b2',
  runtime_b2:     'span-runtime-b2',
  proc_b2:        'span-proc-b2',
  // Summary
  summary_vol:    'span-summary-vol',
  summary_int:    'span-summary-int',
};

// ─── Compile spans + entries ─────────────────────────────────────────────────

export const COMPILE_SPANS: MetricSpan[] = [
  { spanId: IDS.parser_line1,  level: 'parser',  branch: 'compile', label: "Line: 1 '3x10 bench press @135lbs'" },
  { spanId: IDS.dialect_line1, level: 'dialect', branch: 'compile', parentSpanId: IDS.parser_line1 },
  { spanId: IDS.parser_line2,  level: 'parser',  branch: 'compile', label: "Line: 2 'superset rows @95lbs'" },
  { spanId: IDS.dialect_line2, level: 'dialect', branch: 'compile', parentSpanId: IDS.parser_line2 },
];

let eid = 0;
const e = (spanId: string, metricKey: string, metricType: string, value: unknown, state: MetricEntry['state'], unit?: string): MetricEntry => ({
  entryId: `e${++eid}`,
  spanId, metricKey, metricType, value, state, unit,
});

export const COMPILE_ENTRIES: MetricEntry[] = [
  // Line 1 — parser
  e(IDS.parser_line1, 'sets',      'count',      3,       'set'),
  e(IDS.parser_line1, 'reps',      'count',      10,      'set'),
  e(IDS.parser_line1, 'weight',    'lbs',        135,     'set'),
  e(IDS.parser_line1, 'exercise',  'label',      'bench', 'set'),
  e(IDS.parser_line1, 'intensity', 'scale_1_10', null,    'suppressed'),
  // Line 1 — dialect
  e(IDS.dialect_line1, 'intensity', 'scale_1_10', 6,      'set'),
  // Line 2 — parser
  e(IDS.parser_line2, 'sets',      'count',      null,    'inherited'),
  e(IDS.parser_line2, 'reps',      'count',      null,    'inherited'),
  e(IDS.parser_line2, 'weight',    'lbs',        95,      'set'),
  e(IDS.parser_line2, 'exercise',  'label',      'rows',  'set'),
  e(IDS.parser_line2, 'grouping',  'label',      null,    'suppressed'),
  // Line 2 — dialect
  e(IDS.dialect_line2, 'grouping', 'label',      'superset', 'set'),
];

// ─── Plan spans + entries ─────────────────────────────────────────────────────

export const PLAN_SPANS: MetricSpan[] = [
  { spanId: IDS.plan_volume,  level: 'plan', branch: 'compile', label: 'Prediction: Total Volume' },
  { spanId: IDS.plan_fatigue, level: 'plan', branch: 'compile', label: 'Prediction: Fatigue Index' },
];

export const PLAN_ENTRIES: MetricEntry[] = [
  e(IDS.plan_volume,  'total_volume',  'lbs',        6750,  'estimate', 'lbs'),
  e(IDS.plan_volume,  'est_duration',  'minutes',    22,    'estimate', 'min'),
  e(IDS.plan_fatigue, 'fatigue_index', 'scale_1_10', 7,     'estimate'),
];

// ─── Runtime block 1 spans + entries ─────────────────────────────────────────

export const RUNTIME_B1_SPANS: MetricSpan[] = [
  { spanId: IDS.compiler_b1,  level: 'compiler',   branch: 'runtime', label: 'Block rt-001 · bench press',
    startedAt: Date.now() - 465_000, endedAt: Date.now() - 0 },
  { spanId: IDS.runtime_b1,   level: 'runtime',    branch: 'runtime', parentSpanId: IDS.compiler_b1 },
  { spanId: IDS.proc_b1,      level: 'processing', branch: 'runtime', parentSpanId: IDS.compiler_b1 },
  { spanId: IDS.collected_b1, level: 'collected',  branch: 'runtime', parentSpanId: IDS.compiler_b1 },
];

export const RUNTIME_B1_ENTRIES: MetricEntry[] = [
  e(IDS.compiler_b1,  'sets',      'count',      3,    'set'),
  e(IDS.compiler_b1,  'reps',      'count',      10,   'set'),
  e(IDS.compiler_b1,  'weight',    'lbs',        135,  'set'),
  e(IDS.compiler_b1,  'intensity', 'scale_1_10', 6,    'set'),
  e(IDS.compiler_b1,  'duration',  'seconds',    null, 'suppressed'),
  e(IDS.proc_b1,      'sets',      'count',      3,    'inherited'),
  e(IDS.proc_b1,      'reps',      'count',      10,   'inherited'),
  e(IDS.proc_b1,      'duration',  'seconds',    465,  'set'),
  e(IDS.collected_b1, 'intensity', 'scale_1_10', 8,    'collected'),
];

// ─── Runtime block 2 spans + entries ─────────────────────────────────────────

export const RUNTIME_B2_SPANS: MetricSpan[] = [
  { spanId: IDS.compiler_b2, level: 'compiler',   branch: 'runtime', label: 'Block rt-002 · rows' },
  { spanId: IDS.runtime_b2,  level: 'runtime',    branch: 'runtime', parentSpanId: IDS.compiler_b2 },
  { spanId: IDS.proc_b2,     level: 'processing', branch: 'runtime', parentSpanId: IDS.compiler_b2 },
];

export const RUNTIME_B2_ENTRIES: MetricEntry[] = [
  e(IDS.compiler_b2, 'sets',     'count', null,       'inherited'),
  e(IDS.compiler_b2, 'reps',     'count', null,       'inherited'),
  e(IDS.compiler_b2, 'weight',   'lbs',   95,         'set'),
  e(IDS.compiler_b2, 'grouping', 'label', 'superset', 'set'),
  e(IDS.proc_b2,     'duration', 'seconds', 325,      'set'),
];

// ─── Summary spans + entries ──────────────────────────────────────────────────

export const SUMMARY_SPANS: MetricSpan[] = [
  { spanId: IDS.summary_vol, level: 'summary', branch: 'analytics', label: 'Total Volume (actual vs plan)' },
  { spanId: IDS.summary_int, level: 'summary', branch: 'analytics', label: 'Intensity Summary' },
];

export const SUMMARY_ENTRIES: MetricEntry[] = [
  e(IDS.summary_vol, 'total_volume',   'lbs',        7000,  'computed', 'lbs'),
  e(IDS.summary_vol, 'duration',       'minutes',    13.2,  'computed', 'min'),
  e(IDS.summary_int, 'avg_intensity',  'scale_1_10', 7.0,   'computed'),
  e(IDS.summary_int, 'max_intensity',  'scale_1_10', 8,     'computed'),
  e(IDS.summary_int, 'fatigue_index',  'scale_1_10', 7.4,   'computed'),
];
