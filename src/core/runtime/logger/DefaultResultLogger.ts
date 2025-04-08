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
import { DistanceFragment, ResistanceFragment } from "@/core/fragments/ResistanceFragment";

/**
 * Default logger implementation that creates ResultSpans between major timer events.
 */
export class DefaultResultLogger implements IRuntimeLogger {

  // Store fragments associated with the runtime block
  constructor(
    private efforts?: EffortFragment,
    private repetitions?: RepFragment,
    private resistance?: ResistanceFragment,
    private distance?: DistanceFragment
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
    const effort = this.efforts?.effort ?? '';
    const reps = this.repetitions?.reps ?? 0;
    const valueStr = this.resistance?.value ?? this.distance?.value ?? '0';
    const unit = this.resistance?.units ?? this.distance?.units ?? ''    
    let value = parseFloat(valueStr); // Convert string value to number
    console.log(`createMetrics: effort=${effort}, reps=${reps}, value=${value}, unit=${unit}`, this);
    // Handle potential number format issues
    if (isNaN(value)) {
      console.warn(`Invalid value format: ${valueStr}, defaulting to 0`);
      value = 0;
    }
    
    console.log(`createMetrics: effort=${effort}, reps=${reps}, value=${value}, unit=${unit}`);
    
    // Always create a metric even if some values are empty/zero
    // This ensures data flows through the system even if incomplete
    metrics.push({
      effort: effort,
      repetitions: reps,
      value: value,
      unit: unit,
    });

    return metrics;
  }
}
