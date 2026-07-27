import type { IOutputStatement } from '../models/OutputStatement';
import type { ProjectionResult } from './ProjectionResult';
import type { IAnalyticsProcessorDescriptor } from './IAnalyticsProcessorDescriptor';

/**
 * Summary processor contract.
 *
 * Applied to the accumulated output history. Used for multi-segment
 * aggregation and projection (e.g. total reps, total distance, volume).
 */
export interface ISummaryProcessor extends IAnalyticsProcessorDescriptor {
  summarize(outputs: IOutputStatement[]): ProjectionResult[];
}
