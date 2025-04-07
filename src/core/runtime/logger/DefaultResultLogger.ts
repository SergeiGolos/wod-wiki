/**
 * Compiled runtime that manages workout statement nodes and their handlers
 *
 * This class is responsible for:
 * - Storing and indexing statement nodes
 * - Managing runtime handlers for each node
 * - Processing timer events and delegating to appropriate handlers
 */

import { IRuntimeBlock, IRuntimeLogger, ResultSpan, RuntimeEvent, RuntimeMetric } from "@/core/timer.types";
import { EffortFragment } from "@/core/fragments/EffortFragment";
import { RepFragment } from "@/core/fragments/RepFragment";
import { ResistanceFragment } from "@/core/fragments/ResistanceFragment";

/**
 * Default logger implementation that creates ResultSpans between major timer events.
 */
export class DefaultResultLogger implements IRuntimeLogger {

  // Store fragments associated with the runtime block
  constructor(
    private efforts?: EffortFragment,
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
          span.stack = runtimeBlock.stack?.map(node => node.id) ?? undefined;
          span.start = previousRelevantEvent;
          span.stop = currentEvent;          

          // Create and add metrics from stored fragments
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

    // Basic mapping - assumes one set of metrics applies to the whole block/span
    // TODO: Refine logic if metrics need finer-grained association
    const effort = this.efforts?.effort ?? '';
    const reps = this.repetitions?.reps ?? 0;
    const valueStr = this.resistance?.value ?? '0';
    const unit = this.resistance?.units ?? '';
    const value = parseFloat(valueStr) || 0; // Convert string value to number
    console.log(`createMetrics: effort=${effort}, reps=${reps}, value=${valueStr}, unit=${unit}`);
    
    if (effort || reps || value || unit) {
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
