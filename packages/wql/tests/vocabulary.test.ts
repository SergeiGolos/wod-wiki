import { describe, expect, it } from 'vitest';
import { normalizeFieldPath } from '@bitcobblers/wod-wiki-core';
import {
  resolveCanonicalMetricKey,
} from '../src/derivation';
import {
  WQL_AGGREGATORS,
  WQL_CALC_TARGETS,
  WQL_COMPARISON_OPS,
  WQL_DISPLAY_UNITS,
  WQL_FIND_TARGETS,
  WQL_RESULT_PLANES,
  WQL_ROWS_TARGETS,
  WQL_GRAINS,
  WQL_INTENSITY_TIERS,
  WQL_METRIC_AGGREGATES,
  WQL_METRIC_FAMILIES,
  WQL_ROLLUP_PERIODS,
  WQL_SOURCE_VALUES,
  WQL_SOURCES,
  WQL_TAG_KEYS,
  WQL_VIRTUAL_DIMS,
} from '../src/vocabulary';
import * as WqlLanguage from '../src/language';
import { isProposedMetric } from '../src/dashboard/model';

describe('WQL Vocabulary Alignment', () => {
  it('re-exports all vocabulary arrays from language.ts', () => {
    expect(WqlLanguage.WQL_AGGREGATORS).toBe(WQL_AGGREGATORS);
    expect(WqlLanguage.WQL_CALC_TARGETS).toBe(WQL_CALC_TARGETS);
    expect(WqlLanguage.WQL_COMPARISON_OPS).toBe(WQL_COMPARISON_OPS);
    expect(WqlLanguage.WQL_METRIC_AGGREGATES).toBe(WQL_METRIC_AGGREGATES);
    expect(WqlLanguage.WQL_METRIC_FAMILIES).toBe(WQL_METRIC_FAMILIES);
    expect(WqlLanguage.WQL_ROLLUP_PERIODS).toBe(WQL_ROLLUP_PERIODS);
    expect(WqlLanguage.WQL_SOURCE_VALUES).toBe(WQL_SOURCE_VALUES);
    expect(WqlLanguage.WQL_TAG_KEYS).toBe(WQL_TAG_KEYS);
    expect(WqlLanguage.WQL_VIRTUAL_DIMS).toBe(WQL_VIRTUAL_DIMS);
    expect(WqlLanguage.WQL_FIND_TARGETS).toBe(WQL_FIND_TARGETS);
    expect(WqlLanguage.WQL_RESULT_PLANES).toBe(WQL_RESULT_PLANES);
    expect(WqlLanguage.WQL_ROWS_TARGETS).toBe(WQL_ROWS_TARGETS);
  });

  it('correctly classifies known vs proposed metrics in model.ts', () => {
    for (const target of WQL_CALC_TARGETS) {
      expect(isProposedMetric(target)).toBe(false);
    }
    // Only the PMC composite series stays proposed (one scalar key per store calc).
    expect(isProposedMetric('calc.pmc')).toBe(true);
    expect(isProposedMetric('totalVolume')).toBe(false);
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

describe('grain vocabulary — unified pair (ticket 003)', () => {
  it('offers exactly summary | event; rollup is retired', () => {
    expect([...WQL_GRAINS]).toEqual(['summary', 'event']);
  });
});

describe('discovered-identity sync (ticket 11)', () => {
  it('vocabulary keys are stable under field-identity normalization', () => {
    // Every canonical vocabulary key must BE a normalized field identity:
    // discovered entries can never silently diverge from the dictionary.
    const keys = [
      ...WQL_METRIC_FAMILIES,
      ...WQL_METRIC_AGGREGATES,
      ...WQL_TAG_KEYS,
      ...WQL_VIRTUAL_DIMS,
      ...WQL_CALC_TARGETS,
    ];
    for (const key of keys) {
      expect(normalizeFieldPath(key), `${key} must be identity-normalized`).toBe(key);
    }
  });

  it('label-derived canonical keys and field-identity normalization agree', () => {
    // The legacy label fallback and the typed-identity normalizer produce
    // the same key for the same words — one identity space, no drift.
    for (const [label, key] of [
      ['Total Volume', 'totalVolume'],
      ['Heart Rate', 'heartRate'],
      ['sleep score', 'sleepScore'],
    ] as const) {
      expect(resolveCanonicalMetricKey(label)).toBe(key);
      expect(normalizeFieldPath(label)).toBe(key);
    }
  });
});
