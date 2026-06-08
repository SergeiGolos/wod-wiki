import { describe, it, expect } from 'bun:test';
import { MetricContainer } from '../MetricContainer';
import { MetricType, IMetric } from '../Metric';

function makeMetric(type: MetricType, value: number, origin: 'parser' | 'runtime'): IMetric {
  return { type, value, origin, image: String(value) } as IMetric;
}

describe('debug getByType', () => {
  it('sorts runtime first', () => {
    const c = new MetricContainer([
      makeMetric(MetricType.Rep, 10, 'parser'),
      makeMetric(MetricType.Rep, 15, 'runtime'),
    ]);
    const reps = c.getByType(MetricType.Rep);
    console.log('reps[0].origin:', reps[0].origin);
    console.log('reps[1].origin:', reps[1].origin);
    expect(reps[0].origin).toBe('runtime');
  });
});
