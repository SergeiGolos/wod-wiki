import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerState } from '../memory/MemoryTypes';
import { TimeSpan } from '../models/TimeSpan';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

/**
 * TimerTickBehavior subscribes to tick events and updates elapsed time.
 *
 * ## Aspect: Time
 *
 * Listens for 'tick' events and updates the timer state in memory.
 * Works with TimerInitBehavior which sets up the initial state.
 *
 * ## Migration: Fragment-Based Memory
 *
 * This behavior now updates timer fragments in the new list-based memory API
 * while maintaining backward compatibility with the old Map-based API.
 */
export class TimerTickBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Subscribe to tick events
        // Use 'bubble' scope so parent timer blocks continue tracking time
        // even when child blocks are active on the stack
        ctx.subscribe('tick', (_event, tickCtx) => {
            const timer = tickCtx.getMemory('timer') as TimerState | undefined;
            if (!timer) return [];

            // Timer state is updated by the UI observing the spans
            // The spans contain start times, and elapsed is calculated as now - started
            // No need to update memory on every tick - that's expensive
            // Instead, UI should compute elapsed from spans

            return [];
        }, { scope: 'bubble' });

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Close the current span
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        if (timer && timer.spans.length > 0) {
            const now = ctx.clock.now.getTime();
            const updatedSpans = timer.spans.map((span, i) => {
                if (i === timer.spans.length - 1 && span.ended === undefined) {
                    return new TimeSpan(span.started, now);
                }
                return span;
            });

            // Update OLD API
            ctx.setMemory('timer', {
                ...timer,
                spans: updatedSpans
            });

            // Update NEW API - update timer fragment with closed span
            const timerFragment: ICodeFragment = {
                fragmentType: FragmentType.Timer,
                type: 'timer',
                image: this.formatDuration(timer.durationMs),
                origin: 'runtime',
                value: {
                    spans: updatedSpans,
                    direction: timer.direction,
                    durationMs: timer.durationMs,
                    label: timer.label,
                    role: timer.role
                },
                sourceBlockKey: ctx.block.key.toString(),
                timestamp: ctx.clock.now,
            };

            ctx.updateMemory('timer', [timerFragment]);
        }

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
