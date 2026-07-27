import { describe, expect, it } from 'bun:test';
import type { IMetric } from '../../../models/Metric';
import { MetricType } from '../../../models/Metric';
import { createMetricOwnershipLedger } from '../index';

function metric(overrides: Partial<IMetric> & Pick<IMetric, 'type'>): IMetric {
  return {
    origin: 'parser',
    ...overrides,
  } as IMetric;
}

describe('createMetricOwnershipLedger', () => {
  it('returns a visible winner while preserving lower-layer raw contributions', () => {
    const parserMetric = metric({ type: MetricType.Duration, origin: 'parser', value: 'planned' });
    const runtimeMetric = metric({ type: MetricType.Duration, origin: 'runtime', value: 'live' });

    const ledger = createMetricOwnershipLedger([parserMetric, runtimeMetric]);

    expect(ledger.visible()).toEqual([runtimeMetric]);
    expect(ledger.raw()).toEqual([parserMetric, runtimeMetric]);
  });

  it('represents suppress semantics without deleting raw metrics', () => {
    const parserAction = metric({ type: MetricType.Action, origin: 'parser', value: 'EMOM' });
    const suppress = metric({ type: MetricType.Action, origin: 'dialect', action: 'suppress' });

    const ledger = createMetricOwnershipLedger([parserAction, suppress]);

    expect(ledger.visible()).toEqual([]);

    const explanation = ledger.explain({ types: [MetricType.Action] });
    expect(explanation).toHaveLength(1);
    expect(explanation[0].suppressed).toBe(true);
    expect(explanation[0].entries.map((entry) => entry.outcome)).toEqual([
      'hidden-by-suppressor',
      'suppressor',
    ]);

    expect(ledger.raw()).toEqual([parserAction, suppress]);
  });

  it('groups metrics by canonical ownership layer', () => {
    const parserMetric = metric({ type: MetricType.Rep, origin: 'parser', value: 10 });
    const planMetric = metric({
      type: MetricType.Rep,
      origin: 'parser',
      value: 12,
      ownershipLayer: 'user-plan',
    } as IMetric & { ownershipLayer: 'user-plan' });

    const ledger = createMetricOwnershipLedger([parserMetric, planMetric]);
    const byLayer = ledger.byLayer({ types: [MetricType.Rep] });

    expect(byLayer.parser).toEqual([parserMetric]);
    expect(byLayer['user-plan']).toEqual([planMetric]);
  });

  it('returns promotion candidates from the next lower layer', () => {
    const parserMetric = metric({ type: MetricType.Distance, origin: 'parser', value: 5000 });
    const dialectMetric = metric({ type: MetricType.Distance, origin: 'dialect', value: 4200 });
    const runtimeMetric = metric({ type: MetricType.Distance, origin: 'runtime', value: 3200 });

    const ledger = createMetricOwnershipLedger([parserMetric, dialectMetric, runtimeMetric]);
    const candidates = ledger.promotionCandidates({ types: [MetricType.Distance] });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].metric).toEqual(dialectMetric);
    expect(candidates[0].reason).toBe('shadowed-by-higher-layer');
    expect(candidates[0].blockedByLayer).toBe('runtime');
  });

  it('explains visible winners and hidden lower layers', () => {
    const parserMetric = metric({ type: MetricType.Rep, origin: 'parser', value: 10 });
    const runtimeMetric = metric({ type: MetricType.Rep, origin: 'runtime', value: 11 });
    const userMetric = metric({ type: MetricType.Rep, origin: 'user', value: 9 });

    const ledger = createMetricOwnershipLedger([parserMetric, runtimeMetric, userMetric]);
    const explanation = ledger.explain({ types: [MetricType.Rep] });

    expect(explanation).toHaveLength(1);
    expect(explanation[0].winnerLayer).toBe('user-entry');
    expect(explanation[0].entries.map((entry) => entry.outcome)).toEqual([
      'hidden-by-layer',
      'hidden-by-layer',
      'visible',
    ]);
  });
});
