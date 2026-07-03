import { IOutputStatement } from '../models/OutputStatement';
import type { IRealtimeProcessor } from '../analytics/IRealtimeProcessor';
import type { ISummaryProcessor } from '../analytics/ISummaryProcessor';

export interface IAnalyticsEngine {
  /** Register a realtime processor. */
  addRealtimeProcessor(processor: IRealtimeProcessor): void;
  /** Register a summary processor. */
  addSummaryProcessor(processor: ISummaryProcessor): void;
  /** Wire a sink for live analytics outputs (emitted once per segment). */
  setLiveOutputEmitter(emit: (output: IOutputStatement) => void): void;
  /** Run enrichment on a single output, then fire live projection update */
  run(output: IOutputStatement): IOutputStatement;
  /** Final projection pass — returns analytics output statements for summary */
  finalize(): IOutputStatement[];
}
