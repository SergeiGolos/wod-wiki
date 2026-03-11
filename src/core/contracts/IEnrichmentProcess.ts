import { IAnalyticsProcess } from './IAnalyticsEngine';
import { IOutputStatement } from '../models/OutputStatement';

/**
 * An enrichment process derives new metrics from a single segment's own data
 * and pushes them back onto that segment's `metrics` array.
 *
 * ## Distinction from compounding processes
 *
 * | Concern                   | Compounding (IAnalyticsProcess) | Enriching (IEnrichmentProcess) |
 * |---------------------------|---------------------------------|--------------------------------|
 * | Cross-segment state       | ✅ Yes — accumulates totals     | ❌ None                        |
 * | `process()` modifies seg  | ❌ Returns output unmodified    | ✅ Pushes derived metrics      |
 * | `finalize()` creates recs | ✅ Emits summary `analytics`    | Returns `[]` always            |
 * | Example                   | RepAnalyticsProcess             | SpeedEnrichmentProcess         |
 *
 * ## Contract
 * - `process()`: compute derived metric(s) from the current segment alone and push them
 *   onto `output.metrics` with `origin: 'analyzed'`. Return the enriched output.
 * - `finalize()`: always returns `[]`.
 * - No instance fields that accumulate across calls.
 */
export interface IEnrichmentProcess extends IAnalyticsProcess {
    readonly processType: 'enrichment';
    finalize(): [];
}
