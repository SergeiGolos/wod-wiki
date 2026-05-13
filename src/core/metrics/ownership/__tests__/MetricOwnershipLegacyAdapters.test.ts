import { describe, expect, it } from 'bun:test';
import type { IMetric } from '../../../models/Metric';
import { MetricType } from '../../../models/Metric';
import {
  resolveVisibleMetricByTypeWithOwnership,
  resolveVisibleMetricsByTypeWithOwnership,
  resolveVisibleMetricsWithOwnership,
} from '../index';

function metric(overrides: Partial<IMetric> & Pick<IMetric, 'type'>): IMetric {
  return {
    origin: 'parser',
    ...overrides,
  } as IMetric;
}

describe('ownership legacy adapters', () => {
  it('does not mutate raw input metrics while resolving visible compatibility reads', () => {
    const parserMetric = metric({ type: MetricType.Duration, origin: 'parser', value: 'planned' });
    const runtimeMetric = metric({ type: MetricType.Duration, origin: 'runtime', value: 'live' });
    const raw = [parserMetric, runtimeMetric];

    const visible = resolveVisibleMetricsWithOwnership(raw);

    expect(visible).toEqual([runtimeMetric]);
    expect(raw).toEqual([parserMetric, runtimeMetric]);
  });

  it('keeps legacy origin/type filter behavior before ownership visibility resolution', () => {
    const metrics = [
      metric({ type: MetricType.Duration, origin: 'parser', value: 'planned' }),
      metric({ type: MetricType.Duration, origin: 'runtime', value: 'live' }),
      metric({ type: MetricType.Rep, origin: 'parser', value: 10 }),
    ];

    const result = resolveVisibleMetricsWithOwnership(metrics, {
      origins: ['parser'],
      excludeTypes: [MetricType.Rep],
    });

    expect(result).toEqual([
      expect.objectContaining({ type: MetricType.Duration, origin: 'parser', value: 'planned' }),
    ]);
  });

  it('returns the visible metric for one type', () => {
    const parserMetric = metric({ type: MetricType.Distance, origin: 'parser', value: 5000 });
    const runtimeMetric = metric({ type: MetricType.Distance, origin: 'runtime', value: 4200 });

    const winner = resolveVisibleMetricByTypeWithOwnership([parserMetric, runtimeMetric], MetricType.Distance);

    expect(winner).toEqual(runtimeMetric);
  });

  it('returns all metrics in the winning tier for a type', () => {
    const parserMetric = metric({ type: MetricType.Action, origin: 'parser', value: 'Burpees' });
    const runtimeA = metric({ type: MetricType.Action, origin: 'runtime', value: 'Row' });
    const runtimeB = metric({ type: MetricType.Action, origin: 'runtime', value: 'Bike' });

    const winners = resolveVisibleMetricsByTypeWithOwnership(
      [parserMetric, runtimeA, runtimeB],
      MetricType.Action,
    );

    expect(winners).toEqual([runtimeA, runtimeB]);
  });
});
