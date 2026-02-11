import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerDirection } from '../memory/MemoryTypes';
import { TimeSpan } from '../models/TimeSpan';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

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
        const label = this.config.label ?? ctx.block.label;
        const role = this.config.role === 'hidden' ? 'auto' : (this.config.role ?? 'primary');

        // Create timer fragment
        const timerFragment: ICodeFragment = {
            fragmentType: FragmentType.Timer,
            type: 'timer',
            image: this.formatDuration(this.config.durationMs),
            origin: 'runtime',
            value: {
                spans: [new TimeSpan(now)],
                direction: this.config.direction,
                durationMs: this.config.durationMs,
                label,
                role
            },
            sourceBlockKey: ctx.block.key.toString(),
            timestamp: ctx.clock.now,
        };

        // Push timer fragment to list-based memory
        ctx.pushMemory('timer', [timerFragment]);

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }

    /**
     * Format duration in milliseconds to human-readable string (mm:ss or hh:mm:ss)
     */
    private formatDuration(durationMs: number | undefined): string {
        if (durationMs === undefined || durationMs === 0) {
            return '0:00';
        }

        const totalSeconds = Math.floor(durationMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}
