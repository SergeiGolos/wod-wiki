import { describe, expect, it } from 'bun:test';

import { MetricType } from '../../models/Metric';
import { MetricContainer } from '../../models/MetricContainer';
import { OutputStatement } from '../../models/OutputStatement';
import {
  parseCalculateBlock,
  evaluateCalculateDefinitions,
} from '../calculateBlock';

function createOutput(
  metrics: Array<{ type: MetricType | string; value: unknown; unit?: string; key?: string }>,
  elapsedMs: number,
): OutputStatement {
  return new OutputStatement({
    outputType: 'segment',
    timeSpan: { started: 0, ended: elapsedMs },
    sourceBlockKey: 'test-block',
    stackLevel: 0,
    metrics: MetricContainer.from(
      metrics.map((metric) => ({
        ...metric,
        origin: 'runtime' as const,
      })),
    ),
  });
}

describe('calculateBlock edge-case regressions', () => {
  it('returns empty result for empty calculate block', () => {
    const { definitions, errors } = parseCalculateBlock('');
    expect(definitions).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('ignores comment lines and blank lines', () => {
    const { definitions, errors } = parseCalculateBlock(`
      // this is a comment
      total = sum(reps)

      # another comment
      avg = mean(reps)
    `);
    expect(errors).toHaveLength(0);
    expect(definitions).toHaveLength(2);
    expect(definitions[0].target).toBe('total');
    expect(definitions[1].target).toBe('avg');
  });

  it('skips definitions that divide by zero', () => {
    const outputs = [
      createOutput([{ type: MetricType.Rep, value: 10 }], 60000),
    ];
    const { definitions } = parseCalculateBlock('bad = reps / 0');
    const results = evaluateCalculateDefinitions(definitions, outputs);
    expect(results).toHaveLength(0);
  });

  it('supports unary minus on computed values', () => {
    const outputs = [
      createOutput([{ type: MetricType.Rep, value: 10 }], 60000),
    ];
    const { definitions } = parseCalculateBlock(`
      total = sum(reps)
      neg = -total
    `);
    const results = evaluateCalculateDefinitions(definitions, outputs);
    expect(results).toHaveLength(2);
    expect(results[1].value).toBe(-10);
  });

  it('supports power operator on computed values', () => {
    const outputs = [
      createOutput([{ type: MetricType.Rep, value: 3 }], 60000),
    ];
    const { definitions } = parseCalculateBlock(`
      total = sum(reps)
      squared = total ^ 2
    `);
    const results = evaluateCalculateDefinitions(definitions, outputs);
    expect(results).toHaveLength(2);
    expect(results[1].value).toBe(9);
  });

  it('returns empty results for row-level identifier outside aggregate', () => {
    // Direct row identifiers like 'reps' cannot be resolved at top level;
    // they are only available inside aggregate function calls.
    const outputs = [
      createOutput([{ type: MetricType.Rep, value: 10 }], 60000),
    ];
    const { definitions } = parseCalculateBlock('bad = reps');
    const results = evaluateCalculateDefinitions(definitions, outputs);
    expect(results).toHaveLength(0);
  });

  it('returns parse error for invalid tokens without crashing', () => {
    const { definitions, errors } = parseCalculateBlock('total = sum(reps) @');
    expect(definitions).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Unexpected token');
  });

  it('returns parse error for malformed number', () => {
    const { definitions, errors } = parseCalculateBlock('total = 1.2.3');
    expect(definitions).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Invalid number');
  });

  it('sum returns 0 when no rows match', () => {
    const outputs = [
      createOutput([{ type: MetricType.Rep, value: undefined }], 60000),
    ];
    const { definitions } = parseCalculateBlock('total = sum(reps)');
    const results = evaluateCalculateDefinitions(definitions, outputs);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe(0);
  });

  it('mean/max/min return undefined when no rows match', () => {
    const outputs = [
      createOutput([{ type: MetricType.Rep, value: undefined }], 60000),
    ];
    const { definitions } = parseCalculateBlock(`
      avg = mean(reps)
      mx = max(reps)
      mn = min(reps)
    `);
    const results = evaluateCalculateDefinitions(definitions, outputs);
    expect(results).toHaveLength(0);
  });

  it('count with no args returns total row count', () => {
    const outputs = [
      createOutput([{ type: MetricType.Rep, value: 5 }], 60000),
      createOutput([{ type: MetricType.Rep, value: 10 }], 60000),
    ];
    const { definitions } = parseCalculateBlock('totalSets = count()');
    const results = evaluateCalculateDefinitions(definitions, outputs);
    expect(results[0].value).toBe(2);
  });

  it('count with arg returns rows where arg is defined', () => {
    const outputs = [
      createOutput([{ type: MetricType.Rep, value: 5 }], 60000),
      createOutput([{ type: MetricType.Rep, value: undefined }], 60000),
      createOutput([{ type: MetricType.Rep, value: 10 }], 60000),
    ];
    const { definitions } = parseCalculateBlock('totalSets = count(reps)');
    const results = evaluateCalculateDefinitions(definitions, outputs);
    expect(results[0].value).toBe(2);
  });

  it('self-referential definition returns undefined (no infinite loop)', () => {
    const outputs = [
      createOutput([{ type: MetricType.Rep, value: 5 }], 60000),
    ];
    const { definitions } = parseCalculateBlock('a = a + 1');
    const results = evaluateCalculateDefinitions(definitions, outputs);
    expect(results).toHaveLength(0);
  });

  it('chained calculated metrics work in definition order', () => {
    const outputs = [
      createOutput([{ type: MetricType.Rep, value: 5 }], 60000),
      createOutput([{ type: MetricType.Rep, value: 10 }], 60000),
    ];
    const { definitions } = parseCalculateBlock(`
      totalReps = sum(reps)
      doubled = totalReps * 2
    `);
    const results = evaluateCalculateDefinitions(definitions, outputs);
    const byName = new Map(results.map((r) => [r.name, r]));
    expect(byName.get('totalReps')?.value).toBe(15);
    expect(byName.get('doubled')?.value).toBe(30);
  });

  it('skips rows with missing inputs but continues evaluating others', () => {
    const outputs = [
      createOutput([
        { type: MetricType.Rep, value: 5 },
        { type: MetricType.Resistance, value: { amount: 100, unit: 'kg' } },
      ], 60000),
      createOutput([
        { type: MetricType.Rep, value: 3 },
        // missing resistance
      ], 60000),
      createOutput([
        { type: MetricType.Rep, value: 10 },
        { type: MetricType.Resistance, value: { amount: 80, unit: 'kg' } },
      ], 60000),
    ];
    const { definitions } = parseCalculateBlock('totalLoad = sum(reps * weight)');
    const results = evaluateCalculateDefinitions(definitions, outputs);
    expect(results[0].value).toBe(1300); // 5*100 + 10*80 = 1300, row 2 skipped
  });

  it('emits Calculated metric type with metadata', () => {
    const outputs = [
      createOutput([{ type: MetricType.Rep, value: 5 }], 60000),
    ];
    const { definitions } = parseCalculateBlock('total = sum(reps)');
    const results = evaluateCalculateDefinitions(definitions, outputs);
    expect(results[0].metricType).toBe(MetricType.Calculated);
    expect(results[0].metadata).toMatchObject({
      target: 'total',
      expression: 'sum(reps)',
    });
  });

  it('handles custom metric keys via key property', () => {
    const outputs = [
      createOutput([{ type: MetricType.Custom, value: 7, key: 'custom_metric', unit: 'pts' }], 60000),
    ];
    const { definitions } = parseCalculateBlock('total = sum(custom_metric)');
    const results = evaluateCalculateDefinitions(definitions, outputs);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe(7);
  });

  it('handles calculated metric references in downstream calculations', () => {
    const outputs = [
      createOutput([
        { type: MetricType.Rep, value: 5 },
        { type: MetricType.Resistance, value: { amount: 100, unit: 'kg' } },
      ], 60000),
    ];
    const { definitions } = parseCalculateBlock(`
      load = sum(reps * weight)
      normalized = load / 100
    `);
    const results = evaluateCalculateDefinitions(definitions, outputs);
    const byName = new Map(results.map((r) => [r.name, r]));
    expect(byName.get('load')?.value).toBe(500);
    expect(byName.get('normalized')?.value).toBe(5);
  });
});
