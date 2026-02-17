import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext, Unsubscribe } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerState, ChildrenStatusState } from '../memory/MemoryTypes';
import { ClearChildrenAction } from '../actions/stack/ClearChildrenAction';
import { TimeSpan } from '../models/TimeSpan';
import { calculateElapsed } from '../time/calculateElapsed';

export type TimerEndingMode =
    | { mode: 'complete-block' }
    | { mode: 'reset-interval' };

export interface TimerEndingConfig {
    ending: TimerEndingMode;
}

export class TimerEndingBehavior implements IRuntimeBehavior {
    private readonly config: TimerEndingConfig;
    private unsubscribers: Unsubscribe[] = [];

    constructor(config?: TimerEndingConfig) {
        this.config = config ?? { ending: { mode: 'complete-block' } };
    }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const timer = ctx.getMemory('time') as TimerState | undefined;

        if (
            timer &&
            timer.direction === 'down' &&
            timer.durationMs !== undefined &&
            timer.durationMs <= 0
        ) {
            this.emitTimerComplete(ctx);

            if (this.config.ending.mode === 'complete-block') {
                ctx.markComplete('timer-expired');
            } else {
                this.resetIntervalState(ctx, timer);
            }

            return [new ClearChildrenAction(ctx.block.key.toString())];
        }

        const unsubscribe = ctx.subscribe('tick', (_event, tickCtx) => {
            const currentTimer = tickCtx.getMemory('time') as TimerState | undefined;
            if (!currentTimer) return [];
            if (currentTimer.direction !== 'down' || currentTimer.durationMs === undefined) return [];

            if (this.config.ending.mode === 'complete-block' && tickCtx.block.isComplete) {
                return [];
            }

            const now = tickCtx.clock.now.getTime();
            const elapsed = calculateElapsed(currentTimer, now);
            if (elapsed < currentTimer.durationMs) {
                return [];
            }

            this.emitTimerComplete(tickCtx);

            if (this.config.ending.mode === 'complete-block') {
                tickCtx.markComplete('timer-expired');
            } else {
                this.resetIntervalState(tickCtx, currentTimer);
            }

            return [new ClearChildrenAction(tickCtx.block.key.toString())];
        }, { scope: 'bubble' });

        this.unsubscribers.push(unsubscribe);
        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        for (const unsubscribe of this.unsubscribers) {
            unsubscribe();
        }
        this.unsubscribers = [];
    }

    private emitTimerComplete(ctx: IBehaviorContext): void {
        ctx.emitEvent({
            name: 'timer:complete',
            timestamp: ctx.clock.now,
            data: {
                blockKey: ctx.block.key.toString()
            }
        });
    }

    private resetIntervalState(ctx: IBehaviorContext, timer: TimerState): void {
        const now = ctx.clock.now.getTime();

        ctx.setMemory('time', {
            ...timer,
            spans: [new TimeSpan(now)]
        });

        const childStatus = ctx.getMemory('children:status') as ChildrenStatusState | undefined;
        ctx.setMemory('children:status', {
            childIndex: 0,
            totalChildren: childStatus?.totalChildren ?? 0,
            allExecuted: false,
            allCompleted: false
        });
    }
}
