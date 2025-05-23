import { IRuntimeBlock } from "../IRuntimeBlock";
import { ITimerRuntime } from "../ITimerRuntime";
import { RuntimeMetric } from "../RuntimeMetric";

/**
 * Interface for metric composition strategies.
 * 
 * @deprecated Use RuntimeMetricBuilder and RuntimeBlockMetrics instead
 */
export interface IMetricCompositionStrategy {
  composeMetrics(block: IRuntimeBlock, runtime: ITimerRuntime): RuntimeMetric[];
}
