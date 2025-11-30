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
    // Attach metric to the active execution span
    const currentBlock = runtime.stack.current;
    if (currentBlock) {
      const blockId = currentBlock.key.toString();
      
      // Find record in memory
      const refs = runtime.memory.search({ type: 'execution-record', ownerId: blockId });
      if (refs.length > 0) {
        // We need to cast to TypedMemoryReference to use it with set()
        // In a real implementation, we might want a safer way to get the typed reference
        const ref = refs[0] as any; 
        const record = runtime.memory.get(ref);
        
        if (record) {
          // Create updated record (immutability pattern)
          const updatedRecord = {
            ...record,
            metrics: [...(record.metrics || []), this.metric]
          };
          
          // Update memory to trigger subscribers
          runtime.memory.set(ref, updatedRecord);

        }
      }
    }

    // Also collect in the global metrics system for aggregate stats
    if ('metrics' in runtime && runtime.metrics && typeof runtime.metrics.collect === 'function') {
      runtime.metrics.collect(this.metric);
    } else {
      // Gracefully handle if metrics subsystem is not yet implemented
      console.warn('Runtime does not have a metrics collection subsystem');
    }
  }
}
