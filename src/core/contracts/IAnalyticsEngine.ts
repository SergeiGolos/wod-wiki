import { IOutputStatement } from '../models/OutputStatement';
import { IAnalyticsStage } from '../analytics/IAnalyticsStage';
import type { IRealtimeProcessor } from '../analytics/IRealtimeProcessor';
import type { ISummaryProcessor } from '../analytics/ISummaryProcessor';
import { IRuntimeStackTracker } from './RuntimeStackTracker';

export interface IAnalyticsEngine {
  /** Register a realtime processor. */
  addRealtimeProcessor(processor: IRealtimeProcessor): void;
  /** Register a summary processor. */
  addSummaryProcessor(processor: ISummaryProcessor): void;
  /** Register a unified stage (deprecated — migrates to typed lists internally). */
  addStage(stage: IAnalyticsStage): void;
  /** Attach tracker for live per-segment card updates */
  setTracker(tracker: IRuntimeStackTracker): void;
  /** Run enrichment on a single output, then fire live projection update */
  run(output: IOutputStatement): IOutputStatement;
  /** Final projection pass — returns analytics output statements for summary */
  finalize(): IOutputStatement[];
}
