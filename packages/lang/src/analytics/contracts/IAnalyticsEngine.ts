import { IOutputStatement } from '@wod-wiki/core';
import type { IRealtimeProcessor } from '../IRealtimeProcessor';
import type { ISummaryProcessor } from '../ISummaryProcessor';

export interface IAnalyticsEngine {
  /** Register a realtime processor. */
  addRealtimeProcessor(processor: IRealtimeProcessor): void;
  /** Register a summary processor. */
  addSummaryProcessor(processor: ISummaryProcessor): void;
  /**
   * Wire a sink for live analytics outputs. The sink receives the full
   * projection snapshot (ephemeral, display-only) each time projections
   * change — never appended one-at-a-time, and never persisted. Persistence
   * of the final values happens once via {@link finalize}.
   */
  setLiveOutputEmitter(emit: (outputs: IOutputStatement[]) => void): void;
  /** Run enrichment on a single output, then fire live projection update */
  run(output: IOutputStatement): IOutputStatement;
  /** Final projection pass — returns analytics output statements for summary */
  finalize(): IOutputStatement[];
}
