import { IRuntimeBlock } from "../../IRuntimeBlock";
import { ITimerRuntime } from "../../ITimerRuntime";
import { MetricValue } from "../../MetricValue";
import { RuntimeMetric } from "../../RuntimeMetric";
import { MetricCompositionStrategy } from "./MetricCompositionStrategy";

/**
 * A specialized metric composition strategy for blocks that represent specific efforts,
 * such as EffortBlock.
 * 
 * @deprecated Use RuntimeMetricBuilder and RuntimeBlockMetrics instead
 */
export class EffortMetricCompositionStrategy extends MetricCompositionStrategy {
  /**
   * Composes metrics for an effort block by extracting detailed metrics from source fragments.
   * 
   * @param block The runtime block to compose metrics for
   * @param runtime The timer runtime instance
   * @returns An array of RuntimeMetric objects
   */
  public override composeMetrics(block: IRuntimeBlock, runtime: ITimerRuntime): RuntimeMetric[] {
    // Get base metrics from parent class
    const baseMetrics = super.composeMetrics(block, runtime);
    
    // If we already have populated metrics, return them
    if (baseMetrics.length > 0 && baseMetrics.some(m => m.values && m.values.length > 0)) {
      return baseMetrics;
    }
    
    // Otherwise, enhance the base metrics with detailed fragment data
    return this.enhanceMetricsWithFragmentData(baseMetrics, block, runtime);
  }

  /**
   * Enhances base metrics with detailed data from source fragments.
   * 
   * @param baseMetrics The base metrics to enhance
   * @param block The runtime block
   * @param runtime The timer runtime instance
   * @returns Enhanced metrics with values populated from fragments
   */
  protected enhanceMetricsWithFragmentData(
    baseMetrics: RuntimeMetric[],
    block: IRuntimeBlock,
    runtime: ITimerRuntime
  ): RuntimeMetric[] {
    const enhancedMetrics: RuntimeMetric[] = [];
    
    for (let i = 0; i < baseMetrics.length; i++) {
      const metric = { ...baseMetrics[i] };
      const source = block.sources[i];
      
      if (!source) continue;
      
      // Extract and add specific values from fragments
      const values: MetricValue[] = [];
      
      // Check for repetitions
      const repFragment = source.rep?.(runtime.blockKey);
      if (repFragment) {
        values.push({
          type: "repetitions",
          value: repFragment.count,
          unit: "reps"
        });
      }
      
      // Check for resistance
      const resistanceFragment = source.resistance?.(runtime.blockKey);
      if (resistanceFragment) {
        values.push({
          type: "resistance",
          value: Number(resistanceFragment.value),
          unit: resistanceFragment.units || "kg"
        });
      }
      
      // Check for distance
      const distanceFragment = source.distance?.(runtime.blockKey);
      if (distanceFragment) {
        values.push({
          type: "distance",
          value: Number(distanceFragment.value),
          unit: distanceFragment.units || "m"
        });
      }
      
      // Add values to the metric
      metric.values = values;
      enhancedMetrics.push(metric);
    }
    
    return enhancedMetrics;
  }
}