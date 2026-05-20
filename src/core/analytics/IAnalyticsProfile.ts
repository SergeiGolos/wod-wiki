import type { MetricType } from '../models/Metric';
import type { WodDialect } from '@/components/Editor/types';
import type { IRealtimeProcessor } from './IRealtimeProcessor';
import type { ISummaryProcessor } from './ISummaryProcessor';

/**
 * Context used to select processors for a given workout.
 */
export interface AnalyticsProfileContext {
  dialect: WodDialect;
  scriptMetricTypes: ReadonlySet<MetricType>;

  /**
   * Optional user physiological profile. Used by processors that personalize
   * output (e.g. TISProcessor uses vo2max to compute METmax).
   */
  userProfile?: {
    /** VO2max in mL/kg/min — for personalized MET-Score normalization */
    vo2max?: number;
  };
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
