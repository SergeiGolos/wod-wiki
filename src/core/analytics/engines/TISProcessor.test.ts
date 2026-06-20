import { describe, test, expect } from 'bun:test';
import { TISProcessor } from './TISProcessor';
import { IMetric, MetricType } from '../../models/Metric';
import { EFFORT_DATA_METRIC_TYPE } from '../effortResolution';
import type { IEffort } from '@/effort-registry/types';

describe('TISProcessor', () => {
  describe('calculateFromWorkout()', () => {
    test('should return empty array when no elapsed time', () => {
      const engine = new TISProcessor();
      const metrics: IMetric[] = [
        { type: MetricType.Action, value: 'run', origin: 'parser' },
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results).toHaveLength(0);
    });

    test('should calculate TIS with population-average METmax when VO2max is unknown', () => {
      const engine = new TISProcessor(); // no VO2max
      const metrics: IMetric[] = [
        { type: MetricType.Action, value: 'run', origin: 'parser' },
        { type: MetricType.Elapsed, value: 3_600_000, origin: 'runtime' }, // 60 min
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results).toHaveLength(1);

      const tis = results[0];
      expect(tis.name).toBe('Training Intensity Score');
      expect(tis.unit).toBe('pts');
      expect(tis.metricType).toBe(MetricType.TIS);
      expect(tis.origin).toBe('analyzed-estimated');
      expect(tis.metadata?.isEstimated).toBe(true);
      expect(tis.metadata?.metMax).toBe(TISProcessor.FALLBACK_METMAX);
      expect(tis.metadata?.vo2max).toBeUndefined();
    });

    test('should calculate TIS with personalized METmax when VO2max is provided', () => {
      const vo2max = 49.0; // mL/kg/min
      const engine = new TISProcessor(vo2max);
      const metrics: IMetric[] = [
        { type: MetricType.Action, value: 'run', origin: 'parser' },
        { type: MetricType.Elapsed, value: 3_600_000, origin: 'runtime' }, // 60 min
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results).toHaveLength(1);

      const tis = results[0];
      // VO2max is known, but MET is still estimated because no resolved effort-data is present.
      expect(tis.origin).toBe('analyzed-estimated');
      expect(tis.metadata?.isEstimated).toBe(false);
      expect(tis.metadata?.metMax).toBe(vo2max / TISProcessor.METMAX_DIVISOR);
      expect(tis.metadata?.vo2max).toBe(vo2max);
    });

    test('should apply strength discipline factor when Resistance is present', () => {
      const engine = new TISProcessor();
      const metrics: IMetric[] = [
        { type: MetricType.Action, value: 'squat', origin: 'parser' },
        { type: MetricType.Resistance, value: 100, origin: 'parser' },
        { type: MetricType.Elapsed, value: 1_800_000, origin: 'runtime' }, // 30 min
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results).toHaveLength(1);
      expect(results[0].metadata?.disciplineFactor).toBe(1.2);
    });

    test('should apply cardio discipline factor when no Resistance is present', () => {
      const engine = new TISProcessor();
      const metrics: IMetric[] = [
        { type: MetricType.Action, value: 'run', origin: 'parser' },
        { type: MetricType.Elapsed, value: 1_800_000, origin: 'runtime' },
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results).toHaveLength(1);
      expect(results[0].metadata?.disciplineFactor).toBe(1.0);
    });

    test('should use SessionRPE metric when available', () => {
      const engine = new TISProcessor();
      const metrics: IMetric[] = [
        { type: MetricType.Action, value: 'run', origin: 'parser' },
        { type: MetricType.Elapsed, value: 3_600_000, origin: 'runtime' },
        { type: MetricType.SessionRPE, value: 8, origin: 'user' },
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results).toHaveLength(1);
      expect(results[0].metadata?.rpeScore).toBe(80); // 8 × 10
    });

    test('should fallback to effort-derived RPE when no SessionRPE', () => {
      const engine = new TISProcessor();
      const metrics: IMetric[] = [
        { type: MetricType.Action, value: 'run', origin: 'parser' },
        { type: MetricType.Effort, value: 'hard', origin: 'parser' },
        { type: MetricType.Elapsed, value: 3_600_000, origin: 'runtime' },
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results).toHaveLength(1);
      expect(results[0].metadata?.rpeScore).toBe(70); // 7 × 10
    });

    test('should use moderate default RPE when no effort or SessionRPE', () => {
      const engine = new TISProcessor();
      const metrics: IMetric[] = [
        { type: MetricType.Action, value: 'run', origin: 'parser' },
        { type: MetricType.Elapsed, value: 3_600_000, origin: 'runtime' },
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results).toHaveLength(1);
      expect(results[0].metadata?.rpeScore).toBe(50); // 5 × 10
    });

    test('should include component scores in metadata', () => {
      const engine = new TISProcessor();
      const metrics: IMetric[] = [
        { type: MetricType.Action, value: 'run', origin: 'parser' },
        { type: MetricType.Elapsed, value: 3_600_000, origin: 'runtime' },
      ];

      const results = engine.calculateFromWorkout(metrics);
      const meta = results[0].metadata;
      expect(meta).toBeDefined();
      expect(typeof meta?.metScore).toBe('number');
      expect(typeof meta?.durationScore).toBe('number');
      expect(typeof meta?.disciplineFactor).toBe('number');
    });

    test('should use resolved effort MET when effort-data metric is present', () => {
      const engine = new TISProcessor();
      const resolvedEffort: IEffort = {
        id: 'test-1',
        slug: 'running-fast',
        label: 'Running Fast',
        aliases: [],
        baseAttributes: { met: 12.0, discipline: 'running', intensityTier: 'high' },
        registrySource: 'bundled',
      };
      const metrics: IMetric[] = [
        { type: EFFORT_DATA_METRIC_TYPE, value: resolvedEffort, origin: 'compiler', image: resolvedEffort.label },
        { type: MetricType.Elapsed, value: 3_600_000, origin: 'runtime' },
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results).toHaveLength(1);
      expect(results[0].metadata?.usedResolvedEffort).toBe(true);
      expect(results[0].metadata?.effortSlug).toBe('running-fast');
      expect(results[0].metadata?.effortDiscipline).toBe('running');
      // MET 12.0 is higher than hardcoded run=9.8, so metScore should be higher
      expect(results[0].metadata?.metScore).toBeGreaterThan(85);
    });

    test('should flag origin as analyzed-estimated when synthetic effort is used', () => {
      const engine = new TISProcessor();
      const syntheticEffort: IEffort = {
        id: 'synthetic-1',
        slug: 'unknown-thing',
        label: 'Unknown Thing',
        aliases: [],
        baseAttributes: { met: 5.0 },
        registrySource: 'synthetic-unresolved',
      };
      const metrics: IMetric[] = [
        { type: EFFORT_DATA_METRIC_TYPE, value: syntheticEffort, origin: 'analyzed-estimated', image: syntheticEffort.label },
        { type: MetricType.Elapsed, value: 3_600_000, origin: 'runtime' },
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results).toHaveLength(1);
      expect(results[0].origin).toBe('analyzed-estimated');
    });

    test('should use resolved effort discipline for strength factor', () => {
      const engine = new TISProcessor();
      const strengthEffort: IEffort = {
        id: 'test-2',
        slug: 'back-squat',
        label: 'Back Squat',
        aliases: [],
        baseAttributes: { met: 6.0, discipline: 'strength', intensityTier: 'high' },
        registrySource: 'bundled',
      };
      const metrics: IMetric[] = [
        { type: EFFORT_DATA_METRIC_TYPE, value: strengthEffort, origin: 'analyzed', image: strengthEffort.label },
        { type: MetricType.Elapsed, value: 1_800_000, origin: 'runtime' },
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results[0].metadata?.disciplineFactor).toBe(1.2);
      expect(results[0].metadata?.effortDiscipline).toBe('strength');
    });

    test('should accumulate elapsed across multiple segments', () => {
      const engine = new TISProcessor();
      const metrics: IMetric[] = [
        { type: MetricType.Action, value: 'run', origin: 'parser' },
        { type: MetricType.Elapsed, value: 1_800_000, origin: 'runtime' },
        { type: MetricType.Action, value: 'run', origin: 'parser' },
        { type: MetricType.Elapsed, value: 1_800_000, origin: 'runtime' },
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results).toHaveLength(1);
      expect(results[0].metadata?.durationScore).toBeGreaterThan(0);
    });

    test('should cap MET-Score at 100', () => {
      // Very high MET activity with low METmax to test capping
      const engine = new TISProcessor(10); // very low VO2max → METmax ≈ 2.86
      const metrics: IMetric[] = [
        { type: MetricType.Action, value: 'burpee', origin: 'parser' },
        { type: MetricType.Elapsed, value: 3_600_000, origin: 'runtime' },
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results[0].metadata?.metScore).toBe(100);
    });
  });
});
