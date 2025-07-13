import { IRuntimeBlock } from "./IRuntimeBlock";
import { RuntimeMetric } from "./RuntimeMetric";

export interface IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[]): IRuntimeBlock | undefined;
}
