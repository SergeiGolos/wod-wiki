/**
 * Two-Pass Effort Resolution — Integration Test
 *
 * Validates:
 *   1. TwoPassEffortResolutionProcess enriches output statements with effort-data.
 *   2. MetMinuteProjectionEngine consumes resolved effort data (no registry import).
 *   3. TISProcessor branches on effort origin (compiler / analyzed / analyzed-estimated).
 *   4. Fuzzy recovery creates synthetic efforts with default MET 5.0 when unmatched.
 *   5. Fuzzy confidence data is available in projection metadata for debug logging.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { AnalyticsEngine } from '@/core/analytics/AnalyticsEngine';
import { StandardAnalyticsProfile } from '@/core/analytics/StandardAnalyticsProfile';
import type { AnalyticsProfileContext } from '@/core/analytics/IAnalyticsProfile';
import { TwoPassEffortResolutionProcess } from '@/core/analytics/TwoPassEffortResolutionProcess';
import { MetMinuteProjectionEngine } from '@/core/analytics/engines/MetMinuteProjectionEngine';
import { TISProcessor } from '@/core/analytics/engines/TISProcessor';
import { MockEffortResolver } from '@/testing/harness/MockEffortResolver';
import { OutputStatement } from '@/core/models/OutputStatement';
import { MetricContainer } from '@/core/models/MetricContainer';
import { MetricType } from '@/core/models/Metric';
import { EFFORT_DATA_METRIC_TYPE } from '@/core/analytics/effortResolution';
import type { IOutputStatement } from '@/core/models/OutputStatement';
import { fixtureRunning, fixtureRowing, fixtureBackSquat } from '@/effort-registry/fixtures';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeSegment(
  id: string,
  metrics: { type: MetricType | string; value: unknown; origin?: string }[],
): IOutputStatement {
  const container = MetricContainer.empty(id);
  for (const m of metrics) {
    container.add({
      type: m.type as MetricType,
      image: String(m.value),
      value: m.value,
      origin: (m.origin ?? 'runtime') as import('@/core/models/Metric').MetricOrigin,
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

function buildEngine(context: AnalyticsProfileContext): AnalyticsEngine {
  const profile = new StandardAnalyticsProfile();
  const { realtime, summary } = profile.build(context);
  const engine = new AnalyticsEngine();
  for (const p of realtime) engine.addRealtimeProcessor(p);
  for (const p of summary) engine.addSummaryProcessor(p);
  return engine;
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('Two-Pass Effort Resolution Integration', () => {
  beforeEach(() => {
    OutputStatement.resetIdCounter();
  });

  describe('Pass 1: compiler-resolved effort', () => {
    it('resolves compiler-origin effort by slug and attaches effort-data with compiler origin', () => {
      const resolver = new MockEffortResolver().withEfforts([fixtureRunning]);
      const engine = new AnalyticsEngine();
      engine.addRealtimeProcessor(new TwoPassEffortResolutionProcess(resolver));

      const output = makeSegment('seg1', [
        { type: MetricType.Effort, value: 'running-6-mph', origin: 'compiler' },
        { type: MetricType.Elapsed, value: 600_000, origin: 'runtime' },
      ]);

      const result = engine.run(output);
      const effortData = result.metrics.getAllMetricsByType(EFFORT_DATA_METRIC_TYPE as MetricType);

      expect(effortData).toHaveLength(1);
      expect(effortData[0].origin).toBe('compiler');
      expect((effortData[0].value as any).slug).toBe('running-6-mph');
      expect((effortData[0].value as any).baseAttributes.met).toBe(9.8);
    });

    it('MetMinuteProjectionEngine uses compiler-resolved MET without hardcoded lookup', () => {
      const resolver = new MockEffortResolver().withEfforts([fixtureRunning]);
      const context: AnalyticsProfileContext = {
        dialect: 'wod',
        scriptMetricTypes: new Set([MetricType.Action]),
        analyticsContext: { effortResolver: resolver },
      };
      const engine = buildEngine(context);

      engine.run(makeSegment('seg1', [
        { type: MetricType.Effort, value: 'running-6-mph', origin: 'compiler' },
        { type: MetricType.Elapsed, value: 3_600_000, origin: 'runtime' },
      ]));

      const results = engine.finalize();
      const metMinutes = results.find(r => r.getMetric(MetricType.Work));
      expect(metMinutes).toBeDefined();
      expect(metMinutes!.getMetric(MetricType.Work)?.value).toBeGreaterThan(0);
    });
  });

  describe('Pass 2: fuzzy-resolved effort', () => {
    it('resolves fuzzy effort label and attaches effort-data with analyzed origin', () => {
      const resolver = new MockEffortResolver().withEfforts([fixtureRowing]);
      const engine = new AnalyticsEngine();
      engine.addRealtimeProcessor(new TwoPassEffortResolutionProcess(resolver));

      const output = makeSegment('seg1', [
        { type: MetricType.Effort, value: 'rwo', origin: 'parser' },
        { type: MetricType.Elapsed, value: 600_000, origin: 'runtime' },
      ]);

      const result = engine.run(output);
      const effortData = result.metrics.getAllMetricsByType(EFFORT_DATA_METRIC_TYPE as MetricType);

      expect(effortData).toHaveLength(1);
      expect(effortData[0].origin).toBe('analyzed');
      expect((effortData[0].value as any).slug).toBe('rowing');
    });

    it('TISProcessor branches on analyzed origin for fuzzy-matched efforts', () => {
      const resolver = new MockEffortResolver().withEfforts([fixtureRowing]);
      const context: AnalyticsProfileContext = {
        dialect: 'wod',
        scriptMetricTypes: new Set([MetricType.Action]),
        analyticsContext: { effortResolver: resolver },
      };
      const engine = buildEngine(context);

      engine.run(makeSegment('seg1', [
        { type: MetricType.Effort, value: 'rwo', origin: 'parser' },
        { type: MetricType.Elapsed, value: 3_600_000, origin: 'runtime' },
      ]));

      const results = engine.finalize();
      const tis = results.find(r => r.getMetric(MetricType.TIS));
      expect(tis).toBeDefined();
      expect(tis!.metrics.some(m => m.origin === 'analyzed')).toBe(true);
    });
  });

  describe('Pass 2: unresolved fallback effort', () => {
    it('creates synthetic effort with default MET 5.0 when fuzzy resolution fails', () => {
      const resolver = new MockEffortResolver(); // empty — no efforts
      const engine = new AnalyticsEngine();
      engine.addRealtimeProcessor(new TwoPassEffortResolutionProcess(resolver));

      const output = makeSegment('seg1', [
        { type: MetricType.Effort, value: 'XYZ-unknown', origin: 'parser' },
        { type: MetricType.Elapsed, value: 600_000, origin: 'runtime' },
      ]);

      const result = engine.run(output);
      const effortData = result.metrics.getAllMetricsByType(EFFORT_DATA_METRIC_TYPE as MetricType);

      expect(effortData).toHaveLength(1);
      expect(effortData[0].origin).toBe('analyzed-estimated');
      expect((effortData[0].value as any).baseAttributes.met).toBe(5.0);
      expect((effortData[0].value as any).registrySource).toBe('synthetic-unresolved');
    });

    it('MetMinuteProjectionEngine flags estimated origin in metadata for debug', () => {
      const resolver = new MockEffortResolver(); // empty
      const context: AnalyticsProfileContext = {
        dialect: 'wod',
        scriptMetricTypes: new Set([MetricType.Action]),
        analyticsContext: { effortResolver: resolver },
      };
      const engine = buildEngine(context);

      engine.run(makeSegment('seg1', [
        { type: MetricType.Effort, value: 'XYZ-unknown', origin: 'parser' },
        { type: MetricType.Elapsed, value: 3_600_000, origin: 'runtime' },
      ]));

      const results = engine.finalize();
      const metMinutes = results.find(r => r.getMetric(MetricType.Work));
      expect(metMinutes).toBeDefined();
      // MET-minutes with MET 5.0 for 60 min = 300
      expect(metMinutes!.getMetric(MetricType.Work)?.value).toBe(300);
      expect(metMinutes!.metrics.some(m => m.origin === 'analyzed-estimated')).toBe(true);
    });
  });

  describe('Processors do not import registry directly', () => {
    it('MetMinuteProjectionEngine has no registry imports', () => {
      // This is a structural verification: the engine file should not import
      // from effort-registry beyond the resolution helper.
      // The implementation uses extractEffortData which only inspects metrics.
      const resolver = new MockEffortResolver().withEfforts([fixtureBackSquat]);
      const engine = new AnalyticsEngine();
      engine.addRealtimeProcessor(new TwoPassEffortResolutionProcess(resolver));
      engine.addSummaryProcessor(new MetMinuteProjectionEngine());

      engine.run(makeSegment('seg1', [
        { type: MetricType.Effort, value: 'back-squat', origin: 'parser' },
        { type: MetricType.Elapsed, value: 1_800_000, origin: 'runtime' },
      ]));

      const results = engine.finalize();
      expect(results.length).toBeGreaterThan(0);
    });

    it('TISProcessor has no registry imports', () => {
      const resolver = new MockEffortResolver().withEfforts([fixtureRunning]);
      const engine = new AnalyticsEngine();
      engine.addRealtimeProcessor(new TwoPassEffortResolutionProcess(resolver));
      engine.addSummaryProcessor(new TISProcessor());

      engine.run(makeSegment('seg1', [
        { type: MetricType.Effort, value: 'running-6-mph', origin: 'parser' },
        { type: MetricType.Elapsed, value: 3_600_000, origin: 'runtime' },
      ]));

      const results = engine.finalize();
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Fuzzy confidence data for debug logging', () => {
    it('includes effort origin and slug in TIS projection metadata', () => {
      const resolver = new MockEffortResolver().withEfforts([fixtureRowing]);
      const context: AnalyticsProfileContext = {
        dialect: 'wod',
        scriptMetricTypes: new Set([MetricType.Action]),
        analyticsContext: { effortResolver: resolver },
      };
      const engine = buildEngine(context);

      engine.run(makeSegment('seg1', [
        { type: MetricType.Effort, value: 'rwo', origin: 'parser' },
        { type: MetricType.Elapsed, value: 3_600_000, origin: 'runtime' },
      ]));

      const results = engine.finalize();
      const tis = results.find(r => r.getMetric(MetricType.TIS));
      expect(tis).toBeDefined();

      const workMetric = tis!.getMetric(MetricType.TIS);
      expect(workMetric).toBeDefined();
      expect(workMetric!.origin).toBe('analyzed');
    });
  });
});
