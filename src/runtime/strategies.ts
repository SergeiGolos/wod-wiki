
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";
import { RuntimeMetric } from "./RuntimeMetric";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { IScriptRuntime } from "./IScriptRuntime";
import { BoundedLoopingBlock } from './blocks/BoundedLoopingBlock';
import { BoundedLoopingParentBlock } from './blocks/BoundedLoopingParentBlock';
import { TimeBoundedLoopingBlock } from './blocks/TimeBoundedLoopingBlock';
import { TimeBoundBlock } from './blocks/TimeBoundBlock';
import { TimedBlock } from './blocks/TimedBlock';
import { EffortBlock } from "./blocks/EffortBlock";
import { BlockKey } from "../BlockKey";

// The default strategy that creates a simple EffortBlock.
export class EffortStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
        // This is the default, so it always returns a block.
        return new EffortBlock(new BlockKey('effort'), metrics);
    }
}

// Strategy for TimeBoundBlock - Basic timing unit for duration-based workout segments
export class TimeBoundStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasPositiveTime = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value > 0)
        );
        
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        
        if (hasPositiveTime && !hasMultipleRounds) {
            return new TimeBoundBlock(new BlockKey('timebound'), metrics);
        }
        return undefined;
    }
}

// Strategy for TimedBlock - Segment that completes upon external signal rather than fixed duration
export class TimedStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
        // TimedBlock is for cases where we wait for manual completion
        // This could be determined by absence of time metric but presence of effort/action
        const hasTime = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined)
        );
        
        const hasAction = metrics.some(m => 
            m.values.some(v => v.type === 'action' || v.type === 'effort')
        );
        
        if (!hasTime && hasAction) {
            return new TimedBlock(new BlockKey('timed'), metrics);
        }
        return undefined;
    }
}

// Strategy for BoundedLoopingBlock - Has a defined number of rounds to execute the child blocks
export class BoundedLoopingStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        
        // Check for no countdown timer (time < 0) and no positive time
        const hasCountdownTimer = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value < 0)
        );
        
        const hasPositiveTime = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value > 0)
        );
        
        const hasRepetitions = metrics.some(m => 
            m.values.some(v => v.type === 'repetitions' && v.value !== undefined)
        );
        
        if (hasMultipleRounds && !hasCountdownTimer && !hasPositiveTime && !hasRepetitions) {
            return new BoundedLoopingBlock(new BlockKey('bounded-loop'), metrics);
        }
        return undefined;
    }
}

// Strategy for BoundedLoopingParentBlock - Iterates child statements across multiple rounds with repetition tracking
export class BoundedLoopingParentStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        
        const hasRepetitions = metrics.some(m => 
            m.values.some(v => v.type === 'repetitions' && v.value !== undefined)
        );
        
        if (hasMultipleRounds && hasRepetitions) {
            return new BoundedLoopingParentBlock(new BlockKey('bounded-loop-parent'), metrics);
        }
        return undefined;
    }
}

// Strategy for TimeBoundedLoopingBlock - Repeats child statements for a fixed duration
export class TimeBoundedLoopingStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        
        const hasPositiveTime = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value > 0)
        );
        
        if (hasMultipleRounds && hasPositiveTime) {
            return new TimeBoundedLoopingBlock(new BlockKey('time-bounded-loop'), metrics);
        }
        return undefined;
    }
}

// Legacy strategies kept for backward compatibility during transition

// A strategy that creates a CountdownParentBlock if it sees a countdown timer.
import { CountdownParentBlock } from "./blocks/CountdownParentBlock";
export class CountdownStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasCountdownTimer = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value < 0)
        );
        if (hasCountdownTimer) {
            return new CountdownParentBlock(new BlockKey('countdown'), metrics);
        }
        return undefined;
    }
}
