import type { MetricType } from '../models/Metric';
import type { FenceDialect } from '@/components/Editor/types';
import type { IRealtimeProcessor } from './IRealtimeProcessor';
import type { ISummaryProcessor } from './ISummaryProcessor';
import type { AnalyticsContext } from './AnalyticsContext';

/**
 * Context used to select processors for a given workout.
 */
export interface AnalyticsProfileContext {
  dialect: FenceDialect;
  scriptMetricTypes: ReadonlySet<MetricType | string>;

  /**
   * Optional user physiological profile. Used by processors that personalize
   * output (e.g. TISProcessor uses vo2max to compute METmax).
   */
  userProfile?: {
    /** VO2max in mL/kg/min — for personalized MET-Score normalization */
    vo2max?: number;
  };

  /**
   * Analytics context with injected services (e.g. effort resolver).
   * When provided, the profile wires two-pass effort resolution and
   * processors consume resolved effort data instead of hardcoded lookups.
   */
  analyticsContext?: AnalyticsContext;
}

/**
 * Profile that assembles the realtime and summary processor lists
 * for a given workout context.
 */
export interface IAnalyticsProfile {
  build(context: AnalyticsProfileContext): {
    realtime: IRealtimeProcessor[];
    summary: ISummaryProcessor[];
  };
}
