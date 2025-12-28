import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { RuntimeMetric } from '../models/RuntimeMetric';
import { metricsToFragments } from '../utils/metricsToFragments';

/**
 * Action for declarative metric emission from behaviors.
 * 
 * This action allows behaviors to emit metrics through the action system
 * instead of directly manipulating a collector, maintaining declarative patterns.
 * 
 * Metrics are recorded to the active RuntimeSpan via RuntimeReporter.
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
  ) { }

  do(runtime: IScriptRuntime): void {
    const currentBlock = runtime.stack.current;
    if (!currentBlock) return;

    const blockId = currentBlock.key.toString();

    // Primary: convert to fragments and append to execution tracker
    if (runtime.tracker) {
      const fragments = metricsToFragments([this.metric]);
      runtime.tracker.appendFragments(blockId, fragments);

    }


  }
}
