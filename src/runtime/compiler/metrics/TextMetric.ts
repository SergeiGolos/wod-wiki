import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";
import { MetricBehavior } from "../../../types/MetricBehavior";

export class TextMetric implements IMetric {
  readonly value: { text: string, level?: string };
  readonly image: string;
  readonly origin: MetricOrigin = 'parser';
  readonly behavior: MetricBehavior = MetricBehavior.Defined;

  constructor(public text: string, public level?: string) {
    this.value = { text: text, level: level };
    this.image = text;
  }
  readonly type: string = "text";
  readonly metricType = MetricType.Text;
}

