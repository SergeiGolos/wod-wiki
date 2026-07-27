import { describe, expect, it } from 'bun:test';
import {
  getMetricOwnershipLayer,
  LEGACY_ORIGIN_TO_OWNERSHIP_LAYER,
  METRIC_OWNERSHIP_LAYER_CHAIN,
} from '../index';

describe('MetricOwnershipLayer vocabulary', () => {
  it('defines the canonical low-to-high ownership chain', () => {
    expect(METRIC_OWNERSHIP_LAYER_CHAIN).toEqual([
      'parser',
      'dialect',
      'user-plan',
      'runtime',
      'user-entry',
    ]);
  });

  it('maps legacy parser/compiler/dialect origins into ownership layers', () => {
    expect(LEGACY_ORIGIN_TO_OWNERSHIP_LAYER.parser).toBe('parser');
    expect(LEGACY_ORIGIN_TO_OWNERSHIP_LAYER.compiler).toBe('dialect');
    expect(LEGACY_ORIGIN_TO_OWNERSHIP_LAYER.dialect).toBe('dialect');
    expect(LEGACY_ORIGIN_TO_OWNERSHIP_LAYER.hinted).toBe('dialect');
  });

  it('maps runtime-like origins into the runtime ownership layer', () => {
    expect(LEGACY_ORIGIN_TO_OWNERSHIP_LAYER.runtime).toBe('runtime');
    expect(LEGACY_ORIGIN_TO_OWNERSHIP_LAYER.tracked).toBe('runtime');
    expect(LEGACY_ORIGIN_TO_OWNERSHIP_LAYER.analyzed).toBe('runtime');
    expect(LEGACY_ORIGIN_TO_OWNERSHIP_LAYER.execution).toBe('runtime');
  });

  it('maps user-entered origins into the user-entry ownership layer', () => {
    expect(LEGACY_ORIGIN_TO_OWNERSHIP_LAYER.user).toBe('user-entry');
    expect(LEGACY_ORIGIN_TO_OWNERSHIP_LAYER.collected).toBe('user-entry');
  });

  it('defaults undefined origins to the parser ownership layer', () => {
    expect(getMetricOwnershipLayer(undefined)).toBe('parser');
  });
});
