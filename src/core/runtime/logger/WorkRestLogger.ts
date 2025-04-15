import { IRuntimeLogger, IRuntimeBlock, ResultSpan, RuntimeEvent } from "@/core/timer.types";
import { EventSpanAggregator } from "../EventSpanAggregator";

export class WorkRestLogger implements IRuntimeLogger {

  /**
   * Updated (2025-04-14):
   * - Uses EventSpanAggregator for canonical span detection and robust duration reporting.
   * - Handles edge cases and anomalies in event sequences (pause/resume, malformed pairs).
   */
  write(runtimeBlock: IRuntimeBlock): ResultSpan[] {
    // Use EventSpanAggregator for robust span detection
    const aggregator = new EventSpanAggregator(runtimeBlock.events, runtimeBlock.stack);
    const spans = aggregator.getSpans();
    const resultSpans: ResultSpan[] = [];

    spans.forEach((span, i) => {
      if (span.start && span.stop) {
        const resultSpan = new ResultSpan();
        resultSpan.blockKey = runtimeBlock.blockKey;
        resultSpan.index = i;
        resultSpan.start = span.start;
        resultSpan.stop = span.stop;
        resultSpan.label = `Work/Rest Span ${i}`;
        resultSpan.metrics = [...runtimeBlock.metrics];
        if (span.type === 'anomaly') {
          resultSpan.anomaly = true;
        }
        resultSpans.push(resultSpan);
      }
    });

    // Optionally: log or expose anomalies for debugging
    const anomalies = aggregator.getAnomalies();
    if (anomalies.length > 0) {
      // You could log or attach to resultSpans for analytics/debugging
      // console.warn('Event sequence anomalies detected:', anomalies);
    }

    return resultSpans;
  }

  private createMetrics(): RuntimeMetric[] {
    const metrics: RuntimeMetric[] = [];

    const effort = this.efforts?.effort ?? '';
    const reps = this.repetitions?.reps ?? 0;

    const newMetric: RuntimeMetric = {
      effort: effort,
      // Assign repetitions as a MetricValue
      repetitions: { value: reps, unit: "" }, 
    };

    // Add resistance if present
    if (this.resistance) {
      const value = parseFloat(this.resistance.value ?? '0');
      const unit = this.resistance.units ?? '';
      newMetric.resistance = { value: isNaN(value) ? 0 : value, unit: unit };
    }

    // Add distance if present
    if (this.distance) {
      const value = parseFloat(this.distance.value ?? '0');
      const unit = this.distance.units ?? '';
      newMetric.distance = { value: isNaN(value) ? 0 : value, unit: unit };
    }

    console.log(`createMetrics (WorkRest):`, newMetric, this);

    // Push the fully constructed metric
    metrics.push(newMetric);

    return metrics;
  }
}
