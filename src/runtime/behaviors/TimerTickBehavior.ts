import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimeSpan } from '../models/TimeSpan';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

/**
 * TimerTickBehavior subscribes to tick events and updates elapsed time.
 *
 * ## Aspect: Time
 *
 * Listens for 'tick' events and updates the timer state in memory.
 * Works with TimerInitBehavior which sets up the initial state.
 */
export class TimerTickBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Subscribe to tick events
        // Use 'bubble' scope so parent timer blocks continue tracking time
        // even when child blocks are active on the stack
        ctx.subscribe('tick', (_event, _tickCtx) => {
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
        const timerLocations = ctx.block.getMemoryByTag('timer');
        if (timerLocations.length > 0) {
            const timerFragments = timerLocations[0].fragments;
            if (timerFragments.length > 0) {
                const timerValue = timerFragments[0].value;
                const spans = timerValue?.spans || [];
                
                if (spans.length > 0) {
                    const now = ctx.clock.now.getTime();
                    const updatedSpans = spans.map((span, i) => {
                        if (i === spans.length - 1 && span.ended === undefined) {
                            return new TimeSpan(span.started, now);
                        }
                        return span;
                    });

                    // Update timer fragment with closed span
                    const timerFragment: ICodeFragment = {
                        fragmentType: FragmentType.Timer,
                        type: 'timer',
                        image: this.formatDuration(timerValue.durationMs),
                        origin: 'runtime',
                        value: {
                            spans: updatedSpans,
                            direction: timerValue.direction,
                            durationMs: timerValue.durationMs,
                            label: timerValue.label,
                            role: timerValue.role
                        },
                        sourceBlockKey: ctx.block.key.toString(),
                        timestamp: ctx.clock.now,
                    };

                    ctx.updateMemory('timer', [timerFragment]);
                }
            }
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
