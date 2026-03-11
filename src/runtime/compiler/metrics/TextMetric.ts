import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";

export class TextMetric implements IMetric {
  readonly value: { text: string, level?: string };
  readonly image: string;
  readonly origin: MetricOrigin = 'parser';

  constructor(public text: string, public level?: string) {
    this.value = { text: text, level: level };
    this.image = text;
  }
  readonly type = MetricType.Text;
}

