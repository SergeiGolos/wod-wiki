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

describe('MetricOwnershipLedger custom metric coverage', () => {
  it('keeps parser-owned custom metrics visible and overridable', () => {
    const parserCustom = metric({
      type: MetricType.Custom,
      origin: 'parser',
      value: 'Sender One',
      image: 'location: Sender One',
    });
    const userCustom = metric({
      type: MetricType.Custom,
      origin: 'user',
      value: 'Gym B',
      image: 'location: Gym B',
    });

    const ledger = createMetricOwnershipLedger([parserCustom, userCustom]);

    expect(ledger.raw()).toEqual([parserCustom, userCustom]);
    expect(ledger.visible()).toEqual([userCustom]);
    expect(ledger.byLayer()).toMatchObject({
      parser: [parserCustom],
      'user-entry': [userCustom],
    });
    expect(ledger.explain()[0]).toMatchObject({
      type: MetricType.Custom,
      winnerLayer: 'user-entry',
      suppressed: false,
    });
  });
});
