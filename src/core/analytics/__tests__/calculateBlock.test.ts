import { describe, expect, it } from 'bun:test';

import { MetricType } from '../../models/Metric';
import { MetricContainer } from '../../models/MetricContainer';
import { OutputStatement } from '../../models/OutputStatement';
import { AnalyticsEngine } from '../AnalyticsEngine';
import { CalculateBlockProcessor, evaluateCalculateDefinitions, parseCalculateBlock } from '../calculateBlock';

function createOutput(metrics: Array<{ type: MetricType | string; value: unknown; unit?: string }>, elapsedMs: number): OutputStatement {
  return new OutputStatement({
    outputType: 'segment',
    timeSpan: { started: 0, ended: elapsedMs },
    sourceBlockKey: 'test-block',
    stackLevel: 0,
    metrics: MetricContainer.from(metrics.map((metric) => ({
      ...metric,
      origin: 'runtime' as const,
    }))),
  });
}

describe('calculateBlock parsing and evaluation', () => {
  it('parses target assignments with expression metadata', () => {
    const { definitions, errors } = parseCalculateBlock(`
      totalLoad = sum(reps * weight)
      avgRPE = mean(rpe)
      intensityScore = max(intensity) * 0.8 + avgRPE * 0.2
    `);

    expect(errors).toHaveLength(0);
    expect(definitions).toHaveLength(3);
    expect(definitions[0]).toMatchObject({
      target: 'totalLoad',
      expression: 'sum(reps * weight)',
      line: 2,
      sources: ['reps', 'weight'],
    });
    expect(definitions[2].sources).toContain('avgRPE');
  });

  it('reports malformed assignments without stopping later lines', () => {
    const { definitions, errors } = parseCalculateBlock(`
      not-valid
      total = sum(duration)
    `);

    expect(definitions).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(definitions[0].target).toBe('total');
  });

  it('evaluates calculations against runtime outputs and skips rows with missing inputs', () => {
    const outputs = [
      createOutput([
        { type: MetricType.Rep, value: 5 },
        { type: MetricType.Resistance, value: { amount: 100, unit: 'kg' } },
        { type: MetricType.SessionRPE, value: 7 },
        { type: MetricType.Intensity, value: 90 },
      ], 60000),
      createOutput([
        { type: MetricType.Rep, value: 3 },
        { type: MetricType.Resistance, value: { amount: 120, unit: 'kg' } },
        { type: MetricType.Intensity, value: 100 },
      ], 30000),
      createOutput([
        { type: MetricType.Rep, value: 10 },
      ], 45000),
    ];

    const { definitions } = parseCalculateBlock(`
      totalLoad = sum(reps * weight)
      avgRPE = mean(rpe)
      intensityScore = max(intensity) * 0.8 + avgRPE * 0.2
      totalDuration = sum(duration)
      setCount = count(reps)
    `);

    const results = evaluateCalculateDefinitions(definitions, outputs);
    const byName = new Map(results.map((result) => [result.name, result]));

    expect(byName.get('totalLoad')?.metricType).toBe(MetricType.Calculated);
    expect(byName.get('totalLoad')?.value).toBe(860);
    expect(byName.get('avgRPE')?.value).toBe(7);
    expect(byName.get('intensityScore')?.value).toBe(81.4);
    expect(byName.get('totalDuration')?.value).toBe(135);
    expect(byName.get('setCount')?.value).toBe(3);
    expect(byName.get('totalLoad')?.metadata).toMatchObject({
      target: 'totalLoad',
      expression: 'sum(reps * weight)',
      sources: ['reps', 'weight'],
    });
  });

  it('emits runtime analytics outputs with calculated metric metadata', () => {
    const outputs = [
      createOutput([
        { type: MetricType.Rep, value: 5 },
        { type: MetricType.Resistance, value: { amount: 100, unit: 'kg' } },
      ], 60000),
    ];

    const { definitions } = parseCalculateBlock('totalLoad = sum(reps * weight)');
    const processor = new CalculateBlockProcessor(definitions);
    const engine = new AnalyticsEngine();
    engine.addSummaryProcessor(processor);

    for (const output of outputs) {
      engine.run(output);
    }

    const analytics = engine.finalize();
    expect(analytics).toHaveLength(1);

    const calculatedMetric = analytics[0].getMetric(MetricType.Calculated) as any;
    expect(calculatedMetric.value).toBe(500);
    expect(calculatedMetric.metadata).toMatchObject({
      target: 'totalLoad',
      expression: 'sum(reps * weight)',
    });
  });
});
