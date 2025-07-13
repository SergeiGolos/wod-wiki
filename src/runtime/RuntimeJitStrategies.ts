import { IRuntimeBlock } from "./IRuntimeBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";
import { RuntimeMetric } from "./RuntimeMetric";

export class RuntimeJitStrategies {
    private strategies: IRuntimeBlockStrategy[] = [];

    public addStrategy(strategy: IRuntimeBlockStrategy): void {
        this.strategies.push(strategy);
    }

    public compile(metrics: RuntimeMetric[]): IRuntimeBlock | undefined {
        for (const strategy of this.strategies) {
            const block = strategy.compile(metrics);
            if (block) {
                return block;
            }
        }
        return undefined;
    }
}
