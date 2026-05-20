import { describe, it, expect, beforeEach } from 'bun:test';
import { TwoPassEffortResolutionProcess } from '../TwoPassEffortResolutionProcess';
import { OutputStatement } from '../../models/OutputStatement';
import { MetricContainer } from '../../models/MetricContainer';
import { MetricType } from '../../models/Metric';
import { MockEffortResolver } from '@/testing/harness/MockEffortResolver';
import { EFFORT_DATA_METRIC_TYPE, extractEffortData } from '../effortResolution';
import { fixtureRunning, fixtureRowing } from '@/effort-registry/fixtures';

function makeSegment(
  id: string,
  metrics: { type: MetricType | string; value: unknown; origin?: string }[],
) {
  const container = MetricContainer.empty(id);
  for (const m of metrics) {
    container.add({
      type: m.type as MetricType,
      image: String(m.value),
      value: m.value,
      origin: (m.origin ?? 'runtime') as import('../../models/Metric').MetricOrigin,
      timestamp: new Date(0),
    });
  }
  return new OutputStatement({
    outputType: 'segment',
    sourceBlockKey: id,
    stackLevel: 0,
    timeSpan: { started: 0, ended: 60_000 },
    metrics: container,
    isLeaf: true,
  });
}

describe('TwoPassEffortResolutionProcess', () => {
  beforeEach(() => {
    OutputStatement.resetIdCounter();
  });

  it('passes through outputs with no effort or action metric', () => {
    const resolver = new MockEffortResolver();
    const processor = new TwoPassEffortResolutionProcess(resolver);
    const output = makeSegment('seg1', [
      { type: MetricType.Elapsed, value: 60_000, origin: 'runtime' },
    ]);

    const result = processor.process(output);
    expect(result.metrics.has(EFFORT_DATA_METRIC_TYPE as MetricType)).toBe(false);
  });

  it('resolves compiler-origin effort by slug (Pass 1)', () => {
    const resolver = new MockEffortResolver().withEfforts([fixtureRunning]);
    const processor = new TwoPassEffortResolutionProcess(resolver);
    const output = makeSegment('seg1', [
      { type: MetricType.Effort, value: 'running-6-mph', origin: 'compiler' },
    ]);

    const result = processor.process(output);
    const effortData = extractEffortData(result.metrics.rawMetrics);

    expect(effortData).toBeDefined();
    expect(effortData!.origin).toBe('compiler');
    expect(effortData!.effort.slug).toBe('running-6-mph');
    expect(effortData!.effort.baseAttributes.met).toBe(9.8);
  });

  it('falls back to fuzzy when compiler slug is not found', () => {
    const resolver = new MockEffortResolver().withEfforts([fixtureRowing]);
    const processor = new TwoPassEffortResolutionProcess(resolver);
    const output = makeSegment('seg1', [
      { type: MetricType.Effort, value: 'rwo', origin: 'compiler' },
    ]);

    const result = processor.process(output);
    const effortData = extractEffortData(result.metrics.rawMetrics);

    expect(effortData).toBeDefined();
    // Fuzzy match found rowing, so origin should be analyzed (not compiler)
    expect(effortData!.origin).toBe('analyzed');
    expect(effortData!.effort.slug).toBe('rowing');
  });

  it('resolves parser-origin effort via fuzzy match (Pass 2)', () => {
    const resolver = new MockEffortResolver().withEfforts([fixtureRowing]);
    const processor = new TwoPassEffortResolutionProcess(resolver);
    const output = makeSegment('seg1', [
      { type: MetricType.Effort, value: 'rwo', origin: 'parser' },
    ]);

    const result = processor.process(output);
    const effortData = extractEffortData(result.metrics.rawMetrics);

    expect(effortData).toBeDefined();
    expect(effortData!.origin).toBe('analyzed');
    expect(effortData!.effort.slug).toBe('rowing');
  });

  it('creates synthetic effort with default MET 5.0 when fuzzy fails', () => {
    const resolver = new MockEffortResolver();
    const processor = new TwoPassEffortResolutionProcess(resolver);
    const output = makeSegment('seg1', [
      { type: MetricType.Effort, value: 'XYZ-unknown', origin: 'parser' },
    ]);

    const result = processor.process(output);
    const effortData = extractEffortData(result.metrics.rawMetrics);

    expect(effortData).toBeDefined();
    expect(effortData!.origin).toBe('analyzed-estimated');
    expect(effortData!.effort.registrySource).toBe('synthetic-unresolved');
    expect(effortData!.effort.baseAttributes.met).toBe(5.0);
  });

  it('resolves action metric when no effort metric is present', () => {
    const resolver = new MockEffortResolver().withEfforts([fixtureRunning]);
    const processor = new TwoPassEffortResolutionProcess(resolver);
    const output = makeSegment('seg1', [
      { type: MetricType.Action, value: 'run', origin: 'parser' },
    ]);

    const result = processor.process(output);
    const effortData = extractEffortData(result.metrics.rawMetrics);

    expect(effortData).toBeDefined();
    expect(effortData!.effort.slug).toBe('running-6-mph');
  });

  it('inserts effort-data right after the triggering effort metric', () => {
    const resolver = new MockEffortResolver().withEfforts([fixtureRunning]);
    const processor = new TwoPassEffortResolutionProcess(resolver);
    const output = makeSegment('seg1', [
      { type: MetricType.Effort, value: 'run', origin: 'parser' },
      { type: MetricType.Elapsed, value: 60_000, origin: 'runtime' },
    ]);

    const result = processor.process(output);
    const types = result.metrics.rawMetrics.map(m => m.type);

    expect(types).toEqual([
      MetricType.Effort,
      EFFORT_DATA_METRIC_TYPE,
      MetricType.Elapsed,
    ]);
  });

  it('inserts effort-data right after the triggering action metric', () => {
    const resolver = new MockEffortResolver().withEfforts([fixtureRunning]);
    const processor = new TwoPassEffortResolutionProcess(resolver);
    const output = makeSegment('seg1', [
      { type: MetricType.Action, value: 'run', origin: 'parser' },
      { type: MetricType.Elapsed, value: 60_000, origin: 'runtime' },
    ]);

    const result = processor.process(output);
    const types = result.metrics.rawMetrics.map(m => m.type);

    expect(types).toEqual([
      MetricType.Action,
      EFFORT_DATA_METRIC_TYPE,
      MetricType.Elapsed,
    ]);
  });
});
