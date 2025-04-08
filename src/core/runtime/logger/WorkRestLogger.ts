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
}
