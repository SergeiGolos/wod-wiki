import { describe, it, expect, beforeEach } from 'vitest';
import { MetricCollector } from '../../src/runtime/MetricCollector';
import { RuntimeMetric } from './RuntimeMetric';

describe('MetricCollector', () => {
  let collector: MetricCollector;

  beforeEach(() => {
    collector = new MetricCollector();
  });

  describe('collect()', () => {
    it('should collect a metric', () => {
      const metric: RuntimeMetric = {
        exerciseId: 'bench-press',
        values: [{ type: 'repetitions', value: 10, unit: 'reps' }],
        timeSpans: [{ start: new Date(), stop: new Date() }],
      };

      collector.collect(metric);
      
      const metrics = collector.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(metric);
    });

    it('should collect multiple metrics', () => {
      const metric1: RuntimeMetric = {
        exerciseId: 'bench-press',
        values: [{ type: 'repetitions', value: 10, unit: 'reps' }],
        timeSpans: [{ start: new Date(), stop: new Date() }],
      };
      
      const metric2: RuntimeMetric = {
        exerciseId: 'squat',
        values: [{ type: 'repetitions', value: 5, unit: 'reps' }],
        timeSpans: [{ start: new Date(), stop: new Date() }],
      };

      collector.collect(metric1);
      collector.collect(metric2);
      
      const metrics = collector.getMetrics();
      expect(metrics).toHaveLength(2);
      expect(metrics[0]).toEqual(metric1);
      expect(metrics[1]).toEqual(metric2);
    });
  });

  describe('getMetrics()', () => {
    it('should return empty array when no metrics collected', () => {
      const metrics = collector.getMetrics();
      expect(metrics).toEqual([]);
    });

    it('should return copy of metrics array', () => {
      const metric: RuntimeMetric = {
        exerciseId: 'bench-press',
        values: [{ type: 'repetitions', value: 10, unit: 'reps' }],
        timeSpans: [{ start: new Date(), stop: new Date() }],
      };

      collector.collect(metric);
      const metrics1 = collector.getMetrics();
      const metrics2 = collector.getMetrics();
      
      // Should be different array instances
      expect(metrics1).not.toBe(metrics2);
      // But same content
      expect(metrics1).toEqual(metrics2);
    });
  });

  describe('clear()', () => {
    it('should clear all collected metrics', () => {
      const metric: RuntimeMetric = {
        exerciseId: 'bench-press',
        values: [{ type: 'repetitions', value: 10, unit: 'reps' }],
        timeSpans: [{ start: new Date(), stop: new Date() }],
      };

      collector.collect(metric);
      expect(collector.getMetrics()).toHaveLength(1);
      
      collector.clear();
      expect(collector.getMetrics()).toHaveLength(0);
    });
  });
});
