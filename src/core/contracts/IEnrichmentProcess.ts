/**
 * IEnrichmentProcess is now an alias for IAnalyticsProcess.
 *
 * All analytics processes are enrichment-style: stateless, per-segment
 * derivations with no finalize(). This type is kept for backward
 * compatibility; prefer using IAnalyticsProcess directly.
 */
export type { IAnalyticsProcess as IEnrichmentProcess } from './IAnalyticsEngine';
