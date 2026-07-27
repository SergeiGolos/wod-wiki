import { describe, expect, it } from 'bun:test';

import { MetricType, type IMetric } from '../../../models/Metric';
import { createMetricOwnershipLedger } from '../ledger';

function metric(partial: Partial<IMetric> & Pick<IMetric, 'type' | 'origin'>): IMetric {
  return {
    image: partial.image,
    value: partial.value,
    type: partial.type,
    origin: partial.origin,
    unit: partial.unit,
    action: partial.action,
    sourceBlockKey: partial.sourceBlockKey,
    timestamp: partial.timestamp,
  };
}

describe('MetricOwnershipLedger calculated metric coverage', () => {
  it('keeps runtime calculated metrics visible', () => {
    const calculated = metric({
      type: MetricType.Calculated,
      origin: 'runtime',
      value: 420,
      image: '420 pts',
    });

    const ledger = createMetricOwnershipLedger([calculated]);

    expect(ledger.raw()).toEqual([calculated]);
    expect(ledger.visible()).toEqual([calculated]);
    expect(ledger.byLayer()).toMatchObject({
      runtime: [calculated],
    });
    expect(ledger.explain()[0]).toMatchObject({
      type: MetricType.Calculated,
      winnerLayer: 'runtime',
      suppressed: false,
    });
  });

  it('user-entry overrides runtime calculated metrics', () => {
    const runtimeCalculated = metric({
      type: MetricType.Calculated,
      origin: 'runtime',
      value: 420,
      image: '420 pts',
    });
    const userCalculated = metric({
      type: MetricType.Calculated,
      origin: 'user',
      value: 450,
      image: '450 pts',
    });

    const ledger = createMetricOwnershipLedger([runtimeCalculated, userCalculated]);

    expect(ledger.raw()).toEqual([runtimeCalculated, userCalculated]);
    expect(ledger.visible()).toEqual([userCalculated]);
    expect(ledger.explain()[0]).toMatchObject({
      type: MetricType.Calculated,
      winnerLayer: 'user-entry',
      suppressed: false,
    });
  });

  it('mixes calculated and canonical types independently', () => {
    const calculated = metric({
      type: MetricType.Calculated,
      origin: 'runtime',
      value: 500,
    });
    const rep = metric({
      type: MetricType.Rep,
      origin: 'parser',
      value: 21,
    });

    const ledger = createMetricOwnershipLedger([calculated, rep]);

    expect(ledger.raw()).toHaveLength(2);
    expect(ledger.visible()).toHaveLength(2);
    expect(ledger.visible({ types: [MetricType.Calculated] })).toEqual([calculated]);
    expect(ledger.visible({ types: [MetricType.Rep] })).toEqual([rep]);
  });

  it('suppresses calculated metrics when a suppressor is present', () => {
    const calculated = metric({
      type: MetricType.Calculated,
      origin: 'runtime',
      value: 420,
    });
    const suppressor = metric({
      type: MetricType.Calculated,
      origin: 'dialect',
      action: 'suppress',
    });

    const ledger = createMetricOwnershipLedger([calculated, suppressor]);

    expect(ledger.visible({ types: [MetricType.Calculated] })).toHaveLength(0);
    expect(ledger.raw({ types: [MetricType.Calculated] })).toHaveLength(2);
    expect(ledger.promotionCandidates({ types: [MetricType.Calculated] })).toHaveLength(1);
    expect(ledger.promotionCandidates({ types: [MetricType.Calculated] })[0].reason).toBe('suppressed');
  });

  it('promotionCandidates returns calculated metric shadowed by higher layer', () => {
    const parserCalculated = metric({
      type: MetricType.Calculated,
      origin: 'parser',
      value: 400,
    });
    const runtimeCalculated = metric({
      type: MetricType.Calculated,
      origin: 'runtime',
      value: 420,
    });

    const ledger = createMetricOwnershipLedger([parserCalculated, runtimeCalculated]);
    const candidates = ledger.promotionCandidates({ types: [MetricType.Calculated] });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].metric).toBe(parserCalculated);
    expect(candidates[0].layer).toBe('parser');
    expect(candidates[0].blockedByLayer).toBe('runtime');
    expect(candidates[0].reason).toBe('shadowed-by-higher-layer');
  });
});
