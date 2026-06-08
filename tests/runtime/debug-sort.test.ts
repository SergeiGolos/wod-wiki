import { describe, it, expect } from 'bun:test';
import { MetricContainer } from '../core/models/MetricContainer';
import { MetricType, IMetric } from '../core/models/Metric';

function makeMetric(type: MetricType, value: number, origin: 'parser' | 'runtime'): IMetric {
  return { type, value, origin, image: String(value) } as IMetric;
}

describe('debug sort', () => {
  it('sorts runtime first', () => {
    const c = new MetricContainer([
      makeMetric(MetricType.Rep, 10, 'parser'),
      makeMetric(MetricType.Rep, 15, 'runtime'),
    ]);
    const reps = c.getByType(MetricType.Rep);
    console.log('Sorted:', reps.map(r => ({ value: r.value, origin: r.origin })));
    expect(reps[0].origin).toBe('runtime');
  });
});
