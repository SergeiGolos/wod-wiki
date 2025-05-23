import { IRuntimeBlock } from "../../IRuntimeBlock";
import { ITimerRuntime } from "../../ITimerRuntime";
import { RuntimeMetric } from "../../RuntimeMetric";
import { MetricCompositionStrategy } from "./MetricCompositionStrategy";

/**
 * A specialized metric composition strategy for blocks that perform repetitions,
 * such as RepeatingBlock.
 * 
 * @deprecated Use RuntimeMetricBuilder and RuntimeBlockMetrics instead
 */
export class RepetitionMetricCompositionStrategy extends MetricCompositionStrategy {
  /**
   * Creates a new instance of RepetitionMetricCompositionStrategy.
   * 
   * @param roundCount The number of rounds or repetitions
   * @param groupType The group type ('compose', 'round', or other)
   */
  constructor(
    private roundCount: number = 1,
    private groupType: 'compose' | 'round' | string = 'repeat'
  ) {
    super();
  }

  /**
   * Composes metrics for a repeating block based on the group type and round count.
   * 
   * @param block The runtime block to compose metrics for
   * @param runtime The timer runtime instance
   * @returns An array of RuntimeMetric objects
   */
  public override composeMetrics(block: IRuntimeBlock, runtime: ITimerRuntime): RuntimeMetric[] {
    // Get base metrics from the parent class
    const baseMetrics = super.composeMetrics(block, runtime);
    
    if (baseMetrics.length === 0) {
      return [];
    }

    // Apply different composition strategies based on group type
    if (this.groupType === 'compose') {
      // For compose groups, sum child metrics then multiply by rounds
      return this.combineChildMetrics(baseMetrics, 'MULTIPLY', this.roundCount);
    } else if (this.groupType === 'round') {
      // For round-robin groups, sum metrics from each child execution across rounds
      return this.combineChildMetrics(baseMetrics, 'ADD');
    } else {
      // Default 'repeat' - sum total metrics from each child's full execution
      return this.combineChildMetrics(baseMetrics, 'MULTIPLY', this.roundCount);
    }
  }
}