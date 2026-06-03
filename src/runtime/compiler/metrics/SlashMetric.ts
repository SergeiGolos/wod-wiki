import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";

/**
 * SlashMetric — the "/" or "|" separator between paired quantities.
 *
 * Emitted by the semantic classifier for every `Slash` grammar node
 * (which matches both "/" and "|" tokens).
 * Consumed by the fuseUnits dialect to produce two dimensioned metrics
 * (`185/125 lb` → two ResistanceMetrics) or to split adjacent effort
 * tokens (`Run | Walk` → ChoiceGroupMetric).
 *
 * Never reaches compiled blocks or the display layer — any SlashMetric
 * still present after fuseUnits has run should be treated as a no-op.
 */
export class SlashMetric implements IMetric {
  readonly type = MetricType.Slash;
  readonly value = '/';
  readonly image = '/';
  readonly origin: MetricOrigin = 'parser';
}
