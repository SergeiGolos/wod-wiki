import { IRuntimeAction } from "@/core/IRuntimeAction";
import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { RuntimeMetric } from "@/core/RuntimeMetric";
import { Subject } from "rxjs";
import { SetMetricAction } from "../outputs/SetMetricAction";

/**
 * Action to update metrics at runtime
 * This allows blocks to update their metrics during execution
 */
export class UpdateMetricsAction implements IRuntimeAction {
  // Required by IRuntimeAction interface
  public readonly name = "update-metrics";
  /**
   * Create a new UpdateMetricsAction
   * @param blockKey Block key to update metrics for
   * @param metrics Updated metrics
   */
  constructor(
    private blockKey: string,
    private metrics: RuntimeMetric[]
  ) {}

  /**
   * Execute the action - legacy method, use apply instead
   * @param runtime Runtime to execute the action on
   * @returns Array of actions to execute next (e.g., UI updates)
   */
  execute(runtime: ITimerRuntime): IRuntimeAction[] {
    // Find the block by key in the runtime blocks collection
    // Use type assertion to get blocks since we know runtime has blocks internally
    const blocks = (runtime as any).blocks || [];
    const block = blocks.find((b: { blockKey?: string }) => b.blockKey === this.blockKey);
    
    if (!block) {
      console.warn(`Block with key ${this.blockKey} not found for metrics update`);
      return [];
    }
    
    // Check if the block implements IMetricsProvider by detecting updateMetrics method
    if (typeof (block as any).updateMetrics === 'function') {
      // Update the metrics using the IMetricsProvider interface
      (block as any).updateMetrics(() => [...this.metrics]);
      
      // Emit a SetMetricAction to notify the UI of the metrics update
      return [new SetMetricAction(this.blockKey, this.metrics)];
    }
    
    return [];
  }
  
  /**
   * Apply the action (required by IRuntimeAction interface)
   * @param runtime Runtime to apply the action to
   * @param input Input event stream
   * @param output Output event stream
   */
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    output: Subject<OutputEvent>
  ): void {
    // Execute the action and collect follow-up actions
    const followUpActions = this.execute(runtime);
    
    // Execute each follow-up action
    for (const action of followUpActions) {
      action.apply(runtime, _input, output);
    }
  }
}
