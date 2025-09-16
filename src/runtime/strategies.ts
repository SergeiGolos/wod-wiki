
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";
import { RuntimeMetric } from "./RuntimeMetric";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { IScriptRuntime } from "./IScriptRuntime";
import { RepeatingBlock } from './blocks/RepeatingBlock';
import { RepeatingRepsBlock } from './blocks/RepeatingRepsBlock';
import { RepeatingTimedBlock } from './blocks/RepeatingTimedBlock';
import { RepeatingCountdownBlock } from './blocks/RepeatingCountdownBlock';
import { CountdownParentBlock } from "./blocks/CountdownParentBlock";
import { EffortBlock } from "./blocks/EffortBlock";
import { TimerBlock } from "./blocks/TimerBlock";
import { BlockKey } from "../BlockKey";

// The default strategy that creates a simple EffortBlock.
export class EffortStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
        // This is the default, so it always returns a block.
        return new EffortBlock(new BlockKey('effort'), metrics);
    }
}

// A strategy that creates a CountdownParentBlock if it sees a countdown timer.
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

// A strategy that creates a RoundsParentBlock if it sees a rounds metric.
export class RoundsStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        
        // Check for no countdown timer (time < 0)
        const hasCountdownTimer = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value < 0)
        );
        
        if (hasMultipleRounds && !hasCountdownTimer) {
            return new RepeatingBlock(new BlockKey('rounds'), metrics);
        }
        return undefined;
    }
}

// NEW: A strategy that creates RepeatingRepsBlock when rounds > 1 AND repetitions present
export class RepeatingRepsStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        
        const hasRepetitions = metrics.some(m => 
            m.values.some(v => v.type === 'repetitions' && v.value !== undefined)
        );
        
        if (hasMultipleRounds && hasRepetitions) {
            return new RepeatingRepsBlock(new BlockKey('repeating-reps'), metrics);
        }
        return undefined;
    }
}

// NEW: A strategy that creates RepeatingTimedBlock when rounds > 1 AND time > 0
export class RepeatingTimedStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        
        const hasPositiveTime = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value > 0)
        );
        
        if (hasMultipleRounds && hasPositiveTime) {
            return new RepeatingTimedBlock(new BlockKey('repeating-timed'), metrics);
        }
        return undefined;
    }
}

// NEW: A strategy that creates RepeatingCountdownBlock when rounds > 1 AND time < 0
export class RepeatingCountdownStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        
        const hasCountdownTime = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value < 0)
        );
        
        if (hasMultipleRounds && hasCountdownTime) {
            return new RepeatingCountdownBlock(new BlockKey('repeating-countdown'), metrics);
        }
        return undefined;
    }
}

// NEW: A strategy that creates TimerBlock when time > 0 AND NOT rounds > 1
export class TimerStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
        const hasPositiveTime = metrics.some(m => 
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value > 0)
        );
        
        const hasMultipleRounds = metrics.some(m => 
            m.values.some(v => v.type === 'rounds' && v.value !== undefined && v.value > 1)
        );
        
        if (hasPositiveTime && !hasMultipleRounds) {
            return new TimerBlock(new BlockKey('timer'), metrics);
        }
        return undefined;
    }
}
