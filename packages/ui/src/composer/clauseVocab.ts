/**
 * clauseVocab — option lists and multi-value typing for clause editors.
 * Extracted from QueryPalette so the inline editor, the standalone popover,
 * and the clauseItems hook share one vocabulary.
 */
import {
  SOURCE_OPTIONS,
  TIME_OPTIONS,
  AGG_OPTIONS,
  ROLLUP_OPTIONS,
  GROUPBY_OPTIONS,
  METRIC_OPTIONS,
  UNIT_OPTIONS,
} from './queryClauses';
import { WQL_INTENSITY_TIERS } from '@bitcobblers/wod-wiki-wql';

export const MULTI_VALUE_TYPES: Record<string, true> = {
  tag: true,
  catalog: true,
  effort: true,
  discipline: true,
  intensity: true,
  origin: true,
  type: true,
  has: true,
};

export const STATIC_OPTIONS: Record<string, { value: string; label: string }[]> = {
  source: SOURCE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
  time: TIME_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
  agg: AGG_OPTIONS,
  rollup: ROLLUP_OPTIONS,
  groupby: GROUPBY_OPTIONS,
  metric: METRIC_OPTIONS,
  unit: UNIT_OPTIONS,
  intensity: WQL_INTENSITY_TIERS.map((v) => ({ value: v, label: v })),
  origin: ['builtin', 'user', 'canonical', 'custom'].map((v) => ({ value: v, label: v })),
};
