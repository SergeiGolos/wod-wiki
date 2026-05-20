import { describe, it, expect } from 'bun:test';
import { StandardAnalyticsProfile } from './StandardAnalyticsProfile';
import { MetricType } from '../models/Metric';
import type { AnalyticsProfileContext } from './IAnalyticsProfile';

describe('StandardAnalyticsProfile', () => {
  const createContext = (dialect: AnalyticsProfileContext['dialect'], metricTypes: MetricType[]): AnalyticsProfileContext => ({
    dialect,
    scriptMetricTypes: new Set(metricTypes),
  });

  describe('build() with all metrics present', () => {
    it('should return all realtime and summary processors when all required metrics are present', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [
        MetricType.Elapsed,
        MetricType.Rep,
        MetricType.Resistance,
        MetricType.Distance,
        MetricType.Action,
      ]);

      const result = profile.build(context);

      expect(result.realtime).toHaveLength(2);
      expect(result.summary).toHaveLength(6);
    });
  });

  describe('build() requiredMetrics filtering', () => {
    it('should include PaceEnrichmentProcess regardless of metrics (no requiredMetrics)', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [MetricType.Rep]);

      const result = profile.build(context);

      const ids = result.realtime.map(p => p.id);
      expect(ids).toContain('pace-enrichment');
    });

    it('should include PowerEnrichmentProcess when Rep and Resistance are present', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [MetricType.Rep, MetricType.Resistance]);

      const result = profile.build(context);

      const ids = result.realtime.map(p => p.id);
      expect(ids).toContain('power-enrichment');
    });

    it('should exclude PowerEnrichmentProcess when a required metric is absent', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [MetricType.Rep]);

      const result = profile.build(context);

      const ids = result.realtime.map(p => p.id);
      expect(ids).not.toContain('power-enrichment');
    });

    it('should include RepProjectionEngine when Rep is present', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [MetricType.Rep]);

      const result = profile.build(context);

      const ids = result.summary.map(p => p.id);
      expect(ids).toContain('rep-projection');
    });

    it('should exclude RepProjectionEngine when Rep is absent', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [MetricType.Elapsed]);

      const result = profile.build(context);

      const ids = result.summary.map(p => p.id);
      expect(ids).not.toContain('rep-projection');
    });

    it('should include DistanceProjectionEngine when Distance is present', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [MetricType.Distance]);

      const result = profile.build(context);

      const ids = result.summary.map(p => p.id);
      expect(ids).toContain('distance-projection');
    });

    it('should exclude DistanceProjectionEngine when Distance is absent', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [MetricType.Elapsed]);

      const result = profile.build(context);

      const ids = result.summary.map(p => p.id);
      expect(ids).not.toContain('distance-projection');
    });

    it('should include VolumeProjectionEngine when Rep and Resistance are present', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [MetricType.Rep, MetricType.Resistance]);

      const result = profile.build(context);

      const ids = result.summary.map(p => p.id);
      expect(ids).toContain('volume-projection');
    });

    it('should exclude VolumeProjectionEngine when Resistance is absent', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [MetricType.Rep]);

      const result = profile.build(context);

      const ids = result.summary.map(p => p.id);
      expect(ids).not.toContain('volume-projection');
    });

    it('should include SessionLoadProjectionEngine regardless of metrics (no requiredMetrics)', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [MetricType.Rep]);

      const result = profile.build(context);

      const ids = result.summary.map(p => p.id);
      expect(ids).toContain('session-load-projection');
    });

    it('should include MetMinuteProjectionEngine when Action is present', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [MetricType.Action]);

      const result = profile.build(context);

      const ids = result.summary.map(p => p.id);
      expect(ids).toContain('met-minute-projection');
    });

    it('should exclude MetMinuteProjectionEngine when Action is absent', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [MetricType.Elapsed]);

      const result = profile.build(context);

      const ids = result.summary.map(p => p.id);
      expect(ids).not.toContain('met-minute-projection');
    });

    it('should include TISProcessor when Action is present', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [MetricType.Action]);

      const result = profile.build(context);

      const ids = result.summary.map(p => p.id);
      expect(ids).toContain('tis-projection');
    });

    it('should exclude TISProcessor when Action is absent', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [MetricType.Elapsed]);

      const result = profile.build(context);

      const ids = result.summary.map(p => p.id);
      expect(ids).not.toContain('tis-projection');
    });
  });

  describe('build() dialect filtering', () => {
    it('should include log-dialect processors for log context', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('log', [MetricType.Rep, MetricType.Resistance]);

      const result = profile.build(context);

      expect(result.realtime.map(p => p.id)).toContain('pace-enrichment');
      expect(result.realtime.map(p => p.id)).toContain('power-enrichment');
      expect(result.summary.map(p => p.id)).toContain('rep-projection');
      expect(result.summary.map(p => p.id)).toContain('volume-projection');
    });

    it('should include plan-dialect processors for plan context', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('plan', [MetricType.Rep, MetricType.Resistance]);

      const result = profile.build(context);

      // Realtime processors do not declare 'plan', so they are excluded
      expect(result.realtime.map(p => p.id)).not.toContain('pace-enrichment');
      expect(result.realtime.map(p => p.id)).not.toContain('power-enrichment');
      // Summary processors that declare 'plan' are included
      expect(result.summary.map(p => p.id)).toContain('rep-projection');
      expect(result.summary.map(p => p.id)).toContain('volume-projection');
    });

    it('should exclude processors whose dialect list does not match context', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('plan', [MetricType.Elapsed, MetricType.Distance]);

      const result = profile.build(context);

      // SessionLoad and MetMinute do not include 'plan'
      expect(result.summary.map(p => p.id)).not.toContain('session-load-projection');
      expect(result.summary.map(p => p.id)).not.toContain('met-minute-projection');
      // DistanceProjectionEngine includes 'plan'
      expect(result.summary.map(p => p.id)).toContain('distance-projection');
    });
  });

  describe('build() userProfile vo2max passthrough', () => {
    it('should pass vo2max to TISProcessor when provided in context', () => {
      const profile = new StandardAnalyticsProfile();
      const context: AnalyticsProfileContext = {
        dialect: 'wod',
        scriptMetricTypes: new Set([MetricType.Action]),
        userProfile: { vo2max: 49.0 },
      };

      const result = profile.build(context);
      const tis = result.summary.find(p => p.id === 'tis-projection');
      expect(tis).toBeDefined();
    });

    it('should create TISProcessor without vo2max when userProfile is absent', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [MetricType.Action]);

      const result = profile.build(context);
      const tis = result.summary.find(p => p.id === 'tis-projection');
      expect(tis).toBeDefined();
    });
  });

  describe('build() combined filtering', () => {
    it('should return only applicable processors for a strength workout', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [MetricType.Elapsed, MetricType.Rep, MetricType.Resistance]);

      const result = profile.build(context);

      expect(result.realtime.map(p => p.id).sort()).toEqual([
        'pace-enrichment',
        'power-enrichment',
      ]);
      expect(result.summary.map(p => p.id).sort()).toEqual([
        'rep-projection',
        'session-load-projection',
        'volume-projection',
      ]);
    });

    it('should return only applicable processors for a cardio workout', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('wod', [MetricType.Elapsed, MetricType.Distance, MetricType.Action]);

      const result = profile.build(context);

      expect(result.realtime.map(p => p.id).sort()).toEqual([
        'pace-enrichment',
      ]);
      expect(result.summary.map(p => p.id).sort()).toEqual([
        'distance-projection',
        'met-minute-projection',
        'session-load-projection',
        'tis-projection',
      ]);
    });
  });
});
