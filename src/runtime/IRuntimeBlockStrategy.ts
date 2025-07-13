import { IRuntimeBlock } from "./IRuntimeBlock";
import { IScriptRuntime } from "./IScriptRuntime";
import { RuntimeMetric } from "./RuntimeMetric";

export interface IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock | undefined;
}
