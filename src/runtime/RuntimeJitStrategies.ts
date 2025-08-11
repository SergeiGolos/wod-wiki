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

    """    public compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
        console.log(`  🔎 RuntimeJitStrategies.compile() - Attempting to find a strategy for metrics:`, metrics);
        for (const strategy of this.strategies) {
            console.log(`    - Trying strategy: ${strategy.constructor.name}`);
            const block = strategy.compile(metrics, runtime);
            if (block) {
                console.log(`      ✅ Strategy ${strategy.constructor.name} selected.`);
                return block;
            }
        }
        console.log(`    - No strategy found.`);
        return undefined;
    }""
}
