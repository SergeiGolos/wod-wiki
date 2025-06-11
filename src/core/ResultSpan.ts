import { RuntimeMetricEdit } from "./RuntimeMetricEdit";
import { RuntimeSpan } from "./types/RuntimeSpan";

export class ResultSpan extends RuntimeSpan {
  constructor(span: RuntimeSpan) {
    super();
    this.blockKey = span.blockKey;
    this.index = span.index;
    this.timeSpans = span.timeSpans;
    this.metrics = span.metrics;
    this.leaf = span.leaf; // preserve leaf flag
  }

  edit(edits: RuntimeMetricEdit[]): ResultSpan {
    this.metrics = this.metrics.map((metric) => {
      const selected = edits.filter(
        (e) => e.blockKey === this.blockKey && e.index === this.index
      );

      // Apply edits to the appropriate metric value
      for (const edit of selected) {
        // Find the value with the matching type or add a new one
        const valueIndex = metric.values.findIndex(v => v.type === edit.metricType);

        if (valueIndex >= 0) {
          // Update existing value with the new MetricValue's properties
          metric.values[valueIndex] = edit.newValue;
        } else {
          // Add the new MetricValue directly
          metric.values.push(edit.newValue);
        }
      }
      return metric;
    });
    return this;
  }
}
