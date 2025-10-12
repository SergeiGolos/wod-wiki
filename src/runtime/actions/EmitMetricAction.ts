import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { RuntimeMetric } from '../RuntimeMetric';

/**
 * Action for declarative metric emission from behaviors.
 * 
 * This action allows behaviors to emit metrics through the action system
 * instead of directly manipulating a collector, maintaining declarative patterns.
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
    // Assumes runtime has a metric collection subsystem
    if ('metrics' in runtime && runtime.metrics && typeof runtime.metrics.collect === 'function') {
      runtime.metrics.collect(this.metric);
    } else {
      // Gracefully handle if metrics subsystem is not yet implemented
      console.warn('Runtime does not have a metrics collection subsystem');
    }
  }
}
