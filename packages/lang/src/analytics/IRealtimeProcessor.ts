import type { IOutputStatement } from '@bitcobblers/wod-wiki-core';
import type { IAnalyticsProcessorDescriptor } from './IAnalyticsProcessorDescriptor';

/**
 * Realtime processor contract.
 *
 * Applied to every output statement as it is emitted. Used for
 * per-segment metric derivation (e.g. pace, power enrichment).
 */
export interface IRealtimeProcessor extends IAnalyticsProcessorDescriptor {
  process(output: IOutputStatement): IOutputStatement;
}
