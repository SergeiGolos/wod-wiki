import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { RuntimeMetric } from "@/core/RuntimeMetric";
import { LeafNodeAction } from "./base/LeafNodeAction";
import { SetMetricAction } from "../outputs/SetMetricAction";

/**
 * Action to update metrics for a specific block
 * This allows blocks to update their metrics during execution
 */
export class UpdateMetricsAction extends LeafNodeAction {
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
  ) {
    super();
  }

  /**
   * Apply the metrics update to a specific block
   * 
   * @param runtime The timer runtime
   * @param block The block to apply the action to
   */
  protected applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void {
    // Only apply to the block with the matching key
    if (block.blockKey.toString() !== this.blockKey) {
      return;
    }
    
    // Check if the block implements IMetricsProvider by detecting updateMetrics method
    if (typeof (block as any).updateMetrics === 'function') {
      // Update the metrics using the IMetricsProvider interface
      (block as any).updateMetrics(() => [...this.metrics]);
      
      // Emit a SetMetricAction to notify the UI of the metrics update
      runtime.apply([new SetMetricAction(this.blockKey, this.metrics)], block);
    }
  }
}
