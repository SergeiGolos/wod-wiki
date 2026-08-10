/**
 * WQL vocabulary test suite — issue #871.
 *
 * Verifies that the canonical WQL vocabulary exported by `wql-vocabulary.ts`
 * (and re-exported by `wql-language.ts`) is complete and perfectly aligned
 * across consumers:
 *   1. `WQL_CALC_TARGETS` matches the calc engine's registered outputs
 *      in `src/core/analytics/calc/seeds.ts`.
 *   2. `isProposedMetric` in `src/lib/dashboard/model.ts` consumes
 *      `WQL_CALC_TARGETS` (returns false for known calcs, true for proposed).
 *   3. `METRIC_OPTIONS` and `WHERE_METRICS` in `queryClauses.ts` include all `WQL_CALC_TARGETS`
 *      (including `calc.metMinutes`).
 *   4. `wql-language.ts` re-exports all vocabulary constants and types.
 */
import { describe, expect, it } from 'bun:test';
import {
  WQL_AGGREGATORS,
  WQL_CALC_TARGETS,
  WQL_COMPARISON_OPS,
  WQL_DISPLAY_UNITS,
  WQL_FIND_TARGETS,
  WQL_GRAINS,
  WQL_INTENSITY_TIERS,
  WQL_METRIC_AGGREGATES,
  WQL_METRIC_FAMILIES,
  WQL_ROLLUP_PERIODS,
  WQL_SCOPES,
  WQL_SOURCES,
  WQL_TAG_KEYS,
  WQL_VIRTUAL_DIMS,
} from './wql-vocabulary';
import * as WqlLanguage from './wql-language';
import { BUILTIN_CALCS, STORE_CALCS } from '@/core/analytics/calc/seeds';
import { isProposedMetric } from '@/lib/dashboard/model';
import { METRIC_OPTIONS, WHERE_METRICS } from '@/components/organisms/wql-composer/queryClauses';

describe('WQL Vocabulary Alignment (#871)', () => {
  it('re-exports all vocabulary arrays from wql-language.ts', () => {
    expect(WqlLanguage.WQL_AGGREGATORS).toBe(WQL_AGGREGATORS);
    expect(WqlLanguage.WQL_CALC_TARGETS).toBe(WQL_CALC_TARGETS);
    expect(WqlLanguage.WQL_COMPARISON_OPS).toBe(WQL_COMPARISON_OPS);
    expect(WqlLanguage.WQL_METRIC_AGGREGATES).toBe(WQL_METRIC_AGGREGATES);
    expect(WqlLanguage.WQL_METRIC_FAMILIES).toBe(WQL_METRIC_FAMILIES);
    expect(WqlLanguage.WQL_ROLLUP_PERIODS).toBe(WQL_ROLLUP_PERIODS);
    expect(WqlLanguage.WQL_SCOPES).toBe(WQL_SCOPES);
    expect(WqlLanguage.WQL_TAG_KEYS).toBe(WQL_TAG_KEYS);
    expect(WqlLanguage.WQL_VIRTUAL_DIMS).toBe(WQL_VIRTUAL_DIMS);
    expect(WqlLanguage.WQL_FIND_TARGETS).toBe(WQL_FIND_TARGETS);
  });
  it('aligns WQL_CALC_TARGETS with the calc engine registered outputs in seeds.ts', () => {
    const allDefs = [...BUILTIN_CALCS, ...STORE_CALCS];
    const registeredCalcKeys = allDefs
      .flatMap((def) => [def.output?.key, def.output?.emitType])
      .filter((key): key is string => Boolean(key && key.startsWith('calc.')));

    const uniqueRegistered = Array.from(new Set(registeredCalcKeys)).sort();
    const vocabularyCalcTargets = [...WQL_CALC_TARGETS].sort();

    // Every engine-registered output key must be in WQL_CALC_TARGETS
    for (const key of uniqueRegistered) {
      expect(WQL_CALC_TARGETS as readonly string[]).toContain(key);
    }
  });

  it('correctly classifies known vs proposed metrics in model.ts', () => {
    for (const target of WQL_CALC_TARGETS) {
      expect(isProposedMetric(target)).toBe(false);
    }
    // Only the PMC composite series stays proposed (one scalar key per store calc).
    expect(isProposedMetric('calc.pmc')).toBe(true);
    expect(isProposedMetric('totalVolume')).toBe(false);
  });

  it('includes calc.metMinutes and all calc targets in composer METRIC_OPTIONS and WHERE_METRICS', () => {
    const metricValues = METRIC_OPTIONS.map((opt) => opt.value);
    expect(metricValues).toContain('calc.metMinutes');

    for (const target of WQL_CALC_TARGETS) {
      expect(metricValues).toContain(target);
      expect(WHERE_METRICS).toContain(target);
    }
  });

  it('defines valid non-empty arrays for all structural vocabulary categories', () => {
    expect(WQL_AGGREGATORS.length).toBeGreaterThan(0);
    expect(WQL_COMPARISON_OPS.length).toBeGreaterThan(0);
    expect(WQL_DISPLAY_UNITS.length).toBeGreaterThan(0);
    expect(WQL_GRAINS.length).toBeGreaterThan(0);
    expect(WQL_INTENSITY_TIERS.length).toBeGreaterThan(0);
    expect(WQL_ROLLUP_PERIODS.length).toBeGreaterThan(0);
    expect(WQL_SOURCES.length).toBeGreaterThan(0);
  });
});
