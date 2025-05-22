import { IRuntimeBlock } from "../IRuntimeBlock";
import { ITimerRuntime } from "../ITimerRuntime";
import { RuntimeMetric } from "../RuntimeMetric";

export interface IMetricCompositionStrategy {
  composeMetrics(block: IRuntimeBlock, runtime: ITimerRuntime): RuntimeMetric[];
}
