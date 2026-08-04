import { describe, it, expect } from 'bun:test';
import { StandardAnalyticsProfile, realtimeProcessorRegistry, summaryProcessorRegistry } from './StandardAnalyticsProfile';
import { MetricType } from '../models/Metric';
import type { AnalyticsProfileContext } from './IAnalyticsProfile';
import type { IRealtimeProcessor } from './IRealtimeProcessor';
import type { ISummaryProcessor } from './ISummaryProcessor';
import { MockEffortResolver } from '@/testing/harness/MockEffortResolver';

describe('StandardAnalyticsProfile', () => {
  const createContext = (dialect: AnalyticsProfileContext['dialect'], metricTypes: MetricType[]): AnalyticsProfileContext => ({
    dialect,
    scriptMetricTypes: new Set(metricTypes),
  });

  describe('build() with an effort resolver', () => {
    it('registers TwoPass first, then the composed calc engine in both chains', () => {
      const profile = new StandardAnalyticsProfile();
      const context: AnalyticsProfileContext = {
        dialect: 'time',
        scriptMetricTypes: new Set([MetricType.Action, MetricType.Rep, MetricType.Resistance]),
        analyticsContext: { effortResolver: new MockEffortResolver() },
      };

      const result = profile.build(context);

      expect(result.realtime.map((p) => p.id)).toEqual(['two-pass-effort-resolution', 'composed-calculations']);
      expect(result.summary.map((p) => p.id)).toEqual(['composed-calculations']);
      // One engine instance serves both phases (segment annotations + running totals).
      expect(Object.is(result.summary[0], result.realtime[1])).toBe(true);
    });

    it('passes the user profile through to the calc engine (TIS metMax personalization)', () => {
      const profile = new StandardAnalyticsProfile();
      const context: AnalyticsProfileContext = {
        dialect: 'time',
        scriptMetricTypes: new Set([MetricType.Action]),
        analyticsContext: { effortResolver: new MockEffortResolver() },
        userProfile: { vo2max: 49 },
      };

      const result = profile.build(context);
      // Engine constructed without error; vo2max flows via CalcEngineDeps.
      expect(result.summary).toHaveLength(1);
    });

    it('registers neither TwoPass nor the calc engine when no resolver is present', () => {
      const profile = new StandardAnalyticsProfile();
      const context = createContext('time', [MetricType.Action]);

      const result = profile.build(context);

      expect(result.realtime).toHaveLength(0);
      expect(result.summary).toHaveLength(0);
    });
  });

  describe('custom processor registries', () => {
    const customRealtime: IRealtimeProcessor = {
      id: 'custom-realtime',
      fenceTypes: ['time'],
      process: (output) => output,
    };
    const customSummary: ISummaryProcessor = {
      id: 'custom-summary',
      fenceTypes: ['time'],
      requiredMetrics: [MetricType.Rep],
      summarize: () => [],
    };

    it('includes applicable custom processors after the built-in chain', () => {
      realtimeProcessorRegistry.register(customRealtime);
      summaryProcessorRegistry.register(customSummary);
      try {
        const profile = new StandardAnalyticsProfile();
        const context: AnalyticsProfileContext = {
          dialect: 'time',
          scriptMetricTypes: new Set([MetricType.Rep]),
          analyticsContext: { effortResolver: new MockEffortResolver() },
        };

        const result = profile.build(context);

        expect(result.realtime.map((p) => p.id)).toEqual(['two-pass-effort-resolution', 'composed-calculations', 'custom-realtime']);
        expect(result.summary.map((p) => p.id)).toEqual(['composed-calculations', 'custom-summary']);
      } finally {
        realtimeProcessorRegistry.unregister('custom-realtime');
        summaryProcessorRegistry.unregister('custom-summary');
      }
    });

    it('filters custom processors by fence dialect and required metrics', () => {
      realtimeProcessorRegistry.register(customRealtime);
      summaryProcessorRegistry.register(customSummary);
      try {
        const profile = new StandardAnalyticsProfile();

        const wrongDialect = profile.build({
          dialect: 'log',
          scriptMetricTypes: new Set([MetricType.Rep]),
          analyticsContext: { effortResolver: new MockEffortResolver() },
        });
        expect(wrongDialect.realtime.map((p) => p.id)).not.toContain('custom-realtime');
        expect(wrongDialect.summary.map((p) => p.id)).not.toContain('custom-summary');

        const missingMetric = profile.build({
          dialect: 'time',
          scriptMetricTypes: new Set([MetricType.Elapsed]),
          analyticsContext: { effortResolver: new MockEffortResolver() },
        });
        expect(missingMetric.summary.map((p) => p.id)).not.toContain('custom-summary');
      } finally {
        realtimeProcessorRegistry.unregister('custom-realtime');
        summaryProcessorRegistry.unregister('custom-summary');
      }
    });
  });
});
