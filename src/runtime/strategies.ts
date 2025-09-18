
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";
import { RuntimeMetric } from "./RuntimeMetric";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { IScriptRuntime } from "./IScriptRuntime";
import { CountdownParentBlock } from "./blocks/CountdownParentBlock";
import { EffortBlock } from "./blocks/EffortBlock";
import { BlockKey } from "../BlockKey";
import { BoundedLoopingParentBlock } from "./blocks/BoundedLoopingParentBlock";
import { TimeBoundedLoopingBlock } from "./blocks/TimeBoundedLoopingBlock";
import { TimeBoundBlock } from "./blocks/TimeBoundBlock";
import { BoundedLoopingBlock } from "./blocks/BoundedLoopingBlock";
import { TimerBlock } from "./blocks/TimerBlock";

/**
 * The default strategy that creates a simple EffortBlock for repetition-based workouts.
 */
export class EffortStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], _runtime: IScriptRuntime): IRuntimeBlock | undefined {
        // This is the default, so it always returns a block.
        console.log(`  🧠 EffortStrategy considering metrics:`, metrics);
        return new EffortBlock(new BlockKey('effort'), metrics);
    }
}

/**
 * A strategy that creates a CountdownParentBlock for countdown timers.
 */
export class CountdownStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], _runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasCountdownTimer = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value < 0)
        );
        
        console.log(`  🧠 CountdownStrategy - has countdown timer: ${hasCountdownTimer}`);
        
        if (hasCountdownTimer) {
            return new CountdownParentBlock(new BlockKey('countdown'), metrics);
        }
        return undefined;
    }
}

/**
 * A strategy that creates a BoundedLoopingParentBlock for multiple rounds.
 * This is the base implementation for repeating blocks that use rounds.
 */
export class RoundsStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], _runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        
        // Check for no countdown timer (time < 0)
        const hasCountdownTimer = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value < 0)
        );
        
        // Check for no positive timer (time > 0)
        const hasPositiveTimer = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value > 0)
        );
        
        console.log(`  🧠 RoundsStrategy - has multiple rounds: ${hasMultipleRounds}, has countdown: ${hasCountdownTimer}, has timer: ${hasPositiveTimer}`);
        
        // Only handle pure rounds with no timer component
        if (hasMultipleRounds && !hasCountdownTimer && !hasPositiveTimer) {
            return new BoundedLoopingParentBlock(new BlockKey('rounds'), metrics);
        }
        return undefined;
    }
}

/**
 * A strategy that creates a TimeBoundedLoopingBlock when rounds > 1 AND time > 0
 * This is for timed rounds like "5 rounds, each for 1 minute"
 */
export class TimeBoundedRoundsStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], _runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        
        const hasPositiveTime = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value > 0)
        );
        
        console.log(`  🧠 TimeBoundedRoundsStrategy - has multiple rounds: ${hasMultipleRounds}, has positive time: ${hasPositiveTime}`);
        
        if (hasMultipleRounds && hasPositiveTime) {
            return new TimeBoundedLoopingBlock(new BlockKey('timed-rounds'), metrics);
        }
        return undefined;
    }
}

/**
 * A strategy that creates a CountdownParentBlock combined with BoundedLoopingParentBlock
 * when rounds > 1 AND time < 0. For countdown-based rounds.
 */
export class CountdownRoundsStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], _runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        
        const hasCountdownTime = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value < 0)
        );
        
        console.log(`  🧠 CountdownRoundsStrategy - has multiple rounds: ${hasMultipleRounds}, has countdown time: ${hasCountdownTime}`);
        
        if (hasMultipleRounds && hasCountdownTime) {
            // For now, handle with CountdownParentBlock - can be extended with a specialized implementation
            return new CountdownParentBlock(new BlockKey('countdown-rounds'), metrics);
        }
        return undefined;
    }
}

/**
 * A strategy that creates TimerBlock when time > 0 AND NOT rounds > 1
 * This is for simple timer-based workouts like "Work for 2 minutes"
 */
export class TimerStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], _runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasPositiveTime = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value > 0)
        );
        
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        
        console.log(`  🧠 TimerStrategy - has positive time: ${hasPositiveTime}, has multiple rounds: ${hasMultipleRounds}`);
        
        if (hasPositiveTime && !hasMultipleRounds) {
            return new TimerBlock(new BlockKey('timer'), metrics);
        }
        return undefined;
    }
}

/**
 * A strategy that creates TimeBoundBlock when time > 0 AND NOT rounds > 1
 * This is an alternative implementation for simple time-bound workouts
 */
export class TimeBoundStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], _runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasPositiveTime = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value > 0)
        );
        
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        
        console.log(`  🧠 TimeBoundStrategy - has positive time: ${hasPositiveTime}, has multiple rounds: ${hasMultipleRounds}`);
        
        if (hasPositiveTime && !hasMultipleRounds) {
            return new TimeBoundBlock(new BlockKey('time-bound'), metrics);
        }
        return undefined;
    }
}

/**
 * Legacy compatibility exports expected by tests
 * - BoundedLoopingStrategy → returns a pure BoundedLoopingBlock when rounds > 1 and no timers
 * - BoundedLoopingParentStrategy → rounds > 1 AND repetitions present → BoundedLoopingParentBlock
 * - TimeBoundedLoopingStrategy → rounds > 1 AND time > 0 → TimeBoundedLoopingBlock
 */
export class BoundedLoopingStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], _runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        const hasCountdownTimer = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value < 0)
        );
        const hasPositiveTimer = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value > 0)
        );
        if (hasMultipleRounds && !hasCountdownTimer && !hasPositiveTimer) {
            return new BoundedLoopingBlock(new BlockKey('rounds'), metrics);
        }
        return undefined;
    }
}

export class BoundedLoopingParentStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], _runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        const hasReps = metrics.some(m => 
            m.values.some(v => v.type === 'repetitions' && v.value !== undefined && v.value > 0)
        );
        if (hasMultipleRounds && hasReps) {
            return new BoundedLoopingParentBlock(new BlockKey('rounds'), metrics);
        }
        return undefined;
    }
}

export class TimeBoundedLoopingStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], _runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        const hasPositiveTime = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value > 0)
        );
        if (hasMultipleRounds && hasPositiveTime) {
            return new TimeBoundedLoopingBlock(new BlockKey('timed-rounds'), metrics);
        }
        return undefined;
    }
}
