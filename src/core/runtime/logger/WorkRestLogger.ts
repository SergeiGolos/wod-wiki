import { IRuntimeLogger, IRuntimeBlock, ResultSpan, RuntimeEvent } from "@/core/timer.types";

export class WorkRestLogger implements IRuntimeLogger {

  write(runtimeBlock: IRuntimeBlock): ResultSpan[] {
    const timerEventTypes: string[] = ["start", "lap", "done", "complete", "stop"];
    const resultSpans: ResultSpan[] = [];
    let previousRelevantEvent: RuntimeEvent | null = null;

    for (let i = 0; i < runtimeBlock.events.length; i++) {
      const currentEvent: RuntimeEvent = runtimeBlock.events[i];
      const isRelevant = timerEventTypes.includes(currentEvent.name);

      if (isRelevant) {
        if (previousRelevantEvent) {
          const span = new ResultSpan();
          span.blockKey = runtimeBlock.blockKey;
          span.index = i;
          span.start = previousRelevantEvent;
          span.stop = currentEvent;

          span.label = `Work/Rest Span ${i}`;

          // Use the metrics from the runtime block
          span.metrics = [...runtimeBlock.metrics];

          resultSpans.push(span);
        }
        previousRelevantEvent = currentEvent;
      }
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
