import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerDirection } from '../memory/MemoryTypes';
import { TimeSpan } from '../models/TimeSpan';

export interface TimerInitConfig {
    /** Timer direction */
    direction: TimerDirection;
    /** Duration in milliseconds (required for countdown) */
    durationMs?: number;
    /** Human-readable label */
    label?: string;
    /** Timer role for display priority */
    role?: 'primary' | 'secondary' | 'hidden';
}

/**
 * TimerInitBehavior initializes timer state in block memory.
 * 
 * ## Aspect: Time
 * 
 * Sets up the initial timer state that other timer behaviors read/update.
 */
export class TimerInitBehavior implements IRuntimeBehavior {
    constructor(private config: TimerInitConfig) { }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const now = ctx.clock.now.getTime();

        // Initialize timer state in memory
        // Timer start is signaled by the presence of timer memory with an open span
        ctx.setMemory('timer', {
            direction: this.config.direction,
            durationMs: this.config.durationMs,
            spans: [new TimeSpan(now)],
            label: this.config.label ?? ctx.block.label,
            role: this.config.role === 'hidden' ? 'auto' : (this.config.role ?? 'primary')
        });

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }
}
