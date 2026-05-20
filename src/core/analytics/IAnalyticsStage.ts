import type { IOutputStatement } from '../models/OutputStatement';
import type { ProjectionResult } from './ProjectionResult';

/**
 * Unified analytics stage interface.
 *
 * @deprecated Use {@link IRealtimeProcessor} and {@link ISummaryProcessor} instead.
 *   This interface is preserved as a compatibility shim during migration.
 */
export interface IAnalyticsStage {
  readonly id: string;
  /** Per-segment enrichment. Called for every output statement. */
  enrich?(output: IOutputStatement): IOutputStatement;
  /** Multi-segment projection. Called on finalize with accumulated outputs. */
  project?(outputs: IOutputStatement[]): ProjectionResult[];
}
