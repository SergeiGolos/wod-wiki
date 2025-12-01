import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { RuntimeMetric } from '../RuntimeMetric';

/**
 * Action for declarative metric emission from behaviors.
 * 
 * This action allows behaviors to emit metrics through the action system
 * instead of directly manipulating a collector, maintaining declarative patterns.
 * 
 * Metrics are recorded to:
 * 1. The active ExecutionSpan via ExecutionTracker (primary)
 * 2. The global MetricCollector for aggregate stats (secondary)
 * 
 * @example
 * ```typescript
 * // Emit a metric at the end of a round
 * const metric: RuntimeMetric = {
 *   exerciseId: 'bench-press',
 *   values: [{ type: 'repetitions', value: 10, unit: 'reps' }],
 *   timeSpans: [{ start: new Date(), stop: new Date() }]
 * };
 * return [new EmitMetricAction(metric)];
 * ```
 */
export class EmitMetricAction implements IRuntimeAction {
  readonly type = 'emit-metric';
  
  constructor(
    /** The metric to emit */
    public readonly metric: RuntimeMetric
  ) {}

  do(runtime: IScriptRuntime): void {
    const currentBlock = runtime.stack.current;
    if (!currentBlock) return;
    
    const blockId = currentBlock.key.toString();
    
    // Primary: Record to ExecutionTracker (unified tracking)
    if (runtime.tracker) {
      runtime.tracker.recordLegacyMetric(blockId, this.metric);
    }

    // Secondary: Also collect in the global metrics system for aggregate stats
    if (runtime.metrics && typeof runtime.metrics.collect === 'function') {
      runtime.metrics.collect(this.metric);
    }
  }
}
