import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";

/**
 * Action to populate metrics on spans before they are written to results
 * This ensures that spans contain proper metric data for display
 */
export class PopulateMetricsAction implements IRuntimeAction {
  name = "populate_metrics";
  
  constructor(private readonly block: IRuntimeBlock) {}
  
  apply(runtime: ITimerRuntime): void {
    // Skip if no spans exist
    if (!this.block.spans || this.block.spans.length === 0) {
      return;
    }
    
    // Get the latest span
    const currentSpan = this.block.spans[this.block.spans.length - 1];
    
    // Use the block's composition strategy to generate metrics
    const metrics = this.block.metrics(runtime);
    
    // Add metrics to the span
    if (metrics && metrics.length > 0) {
      console.log(`PopulateMetricsAction: Adding ${metrics.length} metrics to span for block ${this.block.blockKey}`);
      currentSpan.metrics = metrics;
    } else {
      console.warn(`PopulateMetricsAction: No metrics composed for block ${this.block.blockKey}`);
    }
  }
}
