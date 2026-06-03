import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";

/**
 * PipeMetric — the "|" separator between alternatives.
 *
 * Emitted by the semantic classifier for every `Pipe` grammar node.
 * Consumed by the fuseUnits dialect to produce ChoiceGroupMetrics
 * (`Run | Walk` → ChoiceGroupMetric([Effort("Run"), Effort("Walk")])).
 *
 * Never reaches compiled blocks or the display layer — any PipeMetric
 * still present after fuseUnits has run should be treated as a no-op.
 */
export class PipeMetric implements IMetric {
  readonly type = MetricType.Pipe;
  readonly value = '|';
  readonly image = '|';
  readonly origin: MetricOrigin = 'parser';
}
