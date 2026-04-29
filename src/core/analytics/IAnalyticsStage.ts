import type { IOutputStatement } from '../models/OutputStatement';
import type { ProjectionResult } from './ProjectionResult';

/**
 * Unified analytics stage interface.
 *
 * A stage may implement one or both phases:
 * - enrich: per-segment metric derivation (called after each output)
 * - project: multi-segment aggregation (called on finalize with all outputs)
 *
 * Stages that implement neither are useless. An invariant check at
 * registration time will catch this in development.
 */
export interface IAnalyticsStage {
  readonly id: string;
  /** Per-segment enrichment. Called for every output statement. */
  enrich?(output: IOutputStatement): IOutputStatement;
  /** Multi-segment projection. Called on finalize with accumulated outputs. */
  project?(outputs: IOutputStatement[]): ProjectionResult[];
}
