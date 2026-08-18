import { describe, it, expect } from 'vitest';
import { toStoredOutputStatement } from '../../src/conversion/toStoredOutputStatement';
import { OutputStatement, MetricContainer, MetricType } from '@bitcobblers/wod-wiki-core';
import { hintMetric } from '../../src/metrics/hints';

describe('toStoredOutputStatement', () => {
  it('converts an OutputStatement to a plain JSON/storage friendly object', () => {
    const output = new OutputStatement({
      outputType: 'segment',
      timeSpan: { started: 1000, ended: 5000 },
      sourceBlockKey: 'block-1',
      metrics: MetricContainer.from([
        { type: MetricType.Rep, value: 10, origin: 'parser' },
        hintMetric('workout.amrap', 'dialect'),
      ]),
      completionReason: 'completed',
    });

    const stored = toStoredOutputStatement(output);
    expect(stored.outputType).toBe('segment');
    expect(stored.timeSpan).toEqual({ started: 1000, ended: 5000 });
    expect(stored.sourceBlockKey).toBe('block-1');
    expect(stored.completionReason).toBe('completed');
    expect(stored.hints).toContain('workout.amrap');
    expect(Array.isArray(stored.metrics)).toBe(true);
  });
});
