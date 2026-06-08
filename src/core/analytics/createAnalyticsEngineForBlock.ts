import { AnalyticsEngine } from './AnalyticsEngine';
import { StandardAnalyticsProfile } from './StandardAnalyticsProfile';
import type { AnalyticsProfileContext } from './IAnalyticsProfile';
import type { AnalyticsContext } from './AnalyticsContext';
import type { ScriptBlock } from '../../components/Editor/types';
import { MetricType } from '../models/Metric';
import { InMemoryEffortRegistry } from '@/effort-registry/InMemoryEffortRegistry';
import { EffortResolver } from '@/effort-registry/EffortResolver';
import { bundledEfforts } from '@/effort-registry/data/bundled-efforts';
import type { IEffortResolver } from '@/effort-registry/types';

export interface CreateAnalyticsEngineResult {
  engine: AnalyticsEngine;
  analyticsContext: AnalyticsContext;
}

export interface CreateAnalyticsEngineOptions {
  effortResolver?: IEffortResolver;
  userProfile?: { vo2max?: number };
}

/**
 * Creates a fully-configured AnalyticsEngine for a WOD block.
 *
 * Extracts the dialect and metric types from the block, builds a
 * StandardAnalyticsProfile, and assembles the engine with all
 * applicable realtime and summary processors.
 *
 * When no effortResolver is provided, creates a default one backed
 * by the bundled effort catalog (synchronously seeded).
 */
export function createAnalyticsEngineForBlock(
  block: ScriptBlock,
  options?: CreateAnalyticsEngineOptions
): CreateAnalyticsEngineResult {
  const dialect = block.dialect || 'wod';

  const scriptMetricTypes = new Set<MetricType | string>();
  if (block.statements) {
    for (const stmt of block.statements) {
      for (const metric of stmt.metrics) {
        scriptMetricTypes.add(metric.type);
      }
    }
  }

  let effortResolver = options?.effortResolver;
  if (!effortResolver) {
    const registry = new InMemoryEffortRegistry();
    registry.seed(bundledEfforts);
    effortResolver = new EffortResolver(registry);
  }

  const analyticsContext: AnalyticsContext = {
    effortResolver,
  };

  const context: AnalyticsProfileContext = {
    dialect,
    scriptMetricTypes,
    analyticsContext,
    userProfile: options?.userProfile,
  };

  const profile = new StandardAnalyticsProfile();
  const { realtime, summary } = profile.build(context);

  const engine = new AnalyticsEngine();
  for (const processor of realtime) {
    engine.addRealtimeProcessor(processor);
  }
  for (const processor of summary) {
    engine.addSummaryProcessor(processor);
  }

  return { engine, analyticsContext };
}
