import { describe, test, expect } from 'bun:test';
import { SessionLoadProjectionEngine } from './SessionLoadProjectionEngine';
import { IMetric, MetricType } from '../../models/Metric';

describe('SessionLoadProjectionEngine', () => {
  describe('calculateFromWorkout()', () => {
    test('should return empty array when no elapsed time', () => {
      const engine = new SessionLoadProjectionEngine();
      const metrics: IMetric[] = [
        { type: MetricType.Action, value: 'run', origin: 'parser' },
      ];

      expect(engine.calculateFromWorkout(metrics)).toHaveLength(0);
    });

    test('should default to moderate RPE 5 when no effort or SessionRPE is present', () => {
      const engine = new SessionLoadProjectionEngine();
      const metrics: IMetric[] = [
        { type: MetricType.Elapsed, value: 1_800_000, origin: 'runtime' }, // 30 min
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Training Load');
      expect(results[0].unit).toBe('AU');
      expect(results[0].metricType).toBe(MetricType.Load);
      expect(results[0].value).toBe(5 * 30); // sRPE 5 × 30 min
      expect(results[0].metadata?.sRPE).toBe(5);
    });

    test('should derive RPE from the effort label when no SessionRPE is present', () => {
      const engine = new SessionLoadProjectionEngine();
      const metrics: IMetric[] = [
        { type: MetricType.Effort, value: 'hard', origin: 'parser' },
        { type: MetricType.Elapsed, value: 1_200_000, origin: 'runtime' }, // 20 min
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe(7 * 20); // hard → RPE 7
      expect(results[0].metadata?.sRPE).toBe(7);
    });

    test('should prefer the user-origin SessionRPE over the effort-label heuristic', () => {
      const engine = new SessionLoadProjectionEngine();
      const metrics: IMetric[] = [
        { type: MetricType.Effort, value: 'easy', origin: 'parser' },
        { type: MetricType.Elapsed, value: 1_200_000, origin: 'runtime' }, // 20 min
        { type: MetricType.SessionRPE, value: 9, origin: 'user' },
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe(9 * 20); // user RPE 9 wins over easy → 3
      expect(results[0].metadata?.sRPE).toBe(9);
    });

    test('should ignore a non-numeric SessionRPE fragment', () => {
      const engine = new SessionLoadProjectionEngine();
      const metrics: IMetric[] = [
        { type: MetricType.Elapsed, value: 600_000, origin: 'runtime' }, // 10 min
        { type: MetricType.SessionRPE, value: 'hard', origin: 'parser' },
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe(5 * 10); // falls back to the moderate default
      expect(results[0].metadata?.sRPE).toBe(5);
    });

    test('should not double-count root container elapsed and child segment elapsed times', () => {
      const engine = new SessionLoadProjectionEngine();
      const rootElapsed = 180_000; // 3 minutes total session duration
      const childElapsed1 = 60_000; // 1 min round 1
      const childElapsed2 = 60_000; // 1 min round 2
      const childElapsed3 = 60_000; // 1 min round 3

      const metrics: IMetric[] = [
        { type: MetricType.Elapsed, value: childElapsed1, origin: 'runtime' },
        { type: MetricType.Elapsed, value: childElapsed2, origin: 'runtime' },
        { type: MetricType.Elapsed, value: childElapsed3, origin: 'runtime' },
        { type: MetricType.Elapsed, value: rootElapsed, origin: 'runtime' },
      ];

      const results = engine.calculateFromWorkout(metrics);
      expect(results).toHaveLength(1);
      // Should count 3 minutes total (sRPE 5 * 3 min = 15 AU), NOT 6 minutes (30 AU)
      expect(results[0].value).toBe(15);
    });
  });
});
