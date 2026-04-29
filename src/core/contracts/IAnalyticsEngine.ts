import { IOutputStatement } from '../models/OutputStatement';
import { IAnalyticsStage } from '../analytics/IAnalyticsStage';
import { RuntimeStackTracker } from '../../runtime/contracts/IRuntimeOptions';

export interface IAnalyticsEngine {
  /** Register a unified stage */
  addStage(stage: IAnalyticsStage): void;
  /** Attach tracker for live per-segment card updates */
  setTracker(tracker: RuntimeStackTracker): void;
  /** Run enrichment on a single output, then fire live projection update */
  run(output: IOutputStatement): IOutputStatement;
  /** Final projection pass — returns analytics output statements for summary */
  finalize(): IOutputStatement[];
}
