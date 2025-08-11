import { IRuntimeBlock } from "./IRuntimeBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";
import { RuntimeMetric } from "./RuntimeMetric";
import { IScriptRuntime } from "./IScriptRuntime";

export class RuntimeJitStrategies {
    private strategies: IRuntimeBlockStrategy[] = [];

    public addStrategy(strategy: IRuntimeBlockStrategy): RuntimeJitStrategies {
        this.strategies.push(strategy);
        return this;
    }

    public compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
        for (const strategy of this.strategies) {
            const block = strategy.compile(metrics, runtime);
            if (block) {
                return block;
            }
        }
        return undefined;
    }
}
