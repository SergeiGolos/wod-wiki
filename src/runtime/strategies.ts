
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";
import { RuntimeMetric } from "./RuntimeMetric";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { EffortBlock, CountdownParentBlock, RoundsParentBlock } from "./blocks";
import { BlockKey } from "../BlockKey";

// The default strategy that creates a simple EffortBlock.
export class EffortStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[]): IRuntimeBlock | undefined {
        // This is the default, so it always returns a block.
        return new EffortBlock(new BlockKey('effort'), metrics);
    }
}

// A strategy that creates a CountdownParentBlock if it sees a countdown timer.
export class CountdownStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[]): IRuntimeBlock | undefined {
        const hasCountdownTimer = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value < 0)
        );
        if (hasCountdownTimer) {
            return new CountdownParentBlock(new BlockKey('countdown'), metrics);
        }
        return undefined;
    }
}

// A strategy that creates a RoundsParentBlock if it sees a rounds metric.
export class RoundsStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[]): IRuntimeBlock | undefined {
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        if (hasMultipleRounds) {
            return new RoundsParentBlock(new BlockKey('rounds'), metrics);
        }
        return undefined;
    }
}
