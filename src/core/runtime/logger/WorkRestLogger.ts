import { IRuntimeLogger, IRuntimeBlock, ResultSpan, RuntimeMetric, RuntimeEvent } from "@/core/timer.types";
import { EffortFragment } from "@/core/fragments/EffortFragment";
import { RepFragment } from "@/core/fragments/RepFragment";
import { ResistanceFragment } from "@/core/fragments/ResistanceFragment";
import { RoundsFragment } from "@/core/fragments/RoundsFragment";

export class WorkRestLogger implements IRuntimeLogger {

  constructor(
    private efforts?: EffortFragment,
    private rounds?: RoundsFragment,
    private repetitions?: RepFragment,
    private resistance?: ResistanceFragment
  ) { }

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

          span.metrics = this.createMetrics();

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
    const valueStr = this.resistance?.value ?? '0';
    const unit = this.resistance?.units ?? '';
    const value = parseFloat(valueStr) || 0;

    const roundCount = this.rounds?.count ?? 0;

    if (effort || reps || value || unit || roundCount) {
      metrics.push({
        effort: effort,
        repetitions: reps,
        value: value,
        unit: unit,
      });
    }

    return metrics;
  }
}
