import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";

/**
 * SlashMetric — the "/" separator for fraction notation.
 *
 * Emitted by the semantic classifier for every `Slash` grammar node.
 * Consumed by the fuseUnits dialect to produce a single decimal metric
 * (`1/4 mile` → Distance(0.25, "mile")).
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
