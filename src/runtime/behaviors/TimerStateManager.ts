import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IRuntimeAction } from '../IRuntimeAction';
import { TimerState, TimerSpan } from '../models/MemoryModels';
import { TypedMemoryReference } from '../IMemoryReference';
import { MemoryTypeEnum } from '../MemoryTypeEnum';
import { PushTimerDisplayAction, PopTimerDisplayAction, UpdateTimerDisplayAction } from '../actions/TimerDisplayActions';
import { PushCardDisplayAction, PopCardDisplayAction } from '../actions/CardDisplayActions';
import { calculateDuration } from '../../lib/timeUtils';

/**
 * TimerStateManager handles the memory state and display actions for a timer.
 */
export class TimerStateManager {
    private timerRef?: TypedMemoryReference<TimerState>;

    constructor(
        private readonly direction: 'up' | 'down',
        private readonly durationMs: number | undefined,
        private readonly label: string
    ) {}

    /**
     * Initializes the timer state in memory and creates display actions.
     * @param runtime The script runtime context
     * @param block The runtime block being initialized
     * @param startTime The timer start timestamp (epoch milliseconds)
     * @param role Optional semantic role for the timer ('root', 'segment', or 'leaf')
     * @returns Array of runtime actions to push timer and card display entries
     */
    initialize(runtime: IScriptRuntime, block: IRuntimeBlock, startTime: number, role: 'primary' | 'secondary' | 'auto' = 'auto', autoStart: boolean = true): IRuntimeAction[] {
        const initialState: TimerState = {
            blockId: block.key.toString(),
            label: this.label,
            format: this.direction === 'down' ? 'down' : 'up',
            durationMs: this.durationMs,
            spans: autoStart ? [{ start: startTime, state: 'new' }] : [],
            isRunning: autoStart,
            card: {
                title: this.direction === 'down' ? 'AMRAP' : 'For Time',
                subtitle: this.label
            }
        };

        this.timerRef = runtime.memory.allocate<TimerState>(
            `${MemoryTypeEnum.TIMER_PREFIX}${block.key.toString()}`,
            block.key.toString(),
            initialState,
            'public'
        );

        // Determine default role if 'auto'
        let finalRole = role;
        if (role === 'auto') {
            // Default: Countdown = Primary (lock view), Countup = Auto (stack based)
            finalRole = this.direction === 'down' ? 'primary' : 'auto';
        }

        const timerAction = new PushTimerDisplayAction({
            id: `timer-${block.key}`,
            ownerId: block.key.toString(),
            timerMemoryId: this.timerRef.id,
            label: this.label,
            format: this.direction === 'down' ? 'countdown' : 'countup',
            durationMs: this.durationMs,
            role: finalRole,
            // Initialize with live timer data
            accumulatedMs: 0,
            startTime: autoStart ? startTime : undefined,
            isRunning: autoStart
        });

        const fragmentMetrics = (block.fragments?.flat() ?? []).map(f => ({
            type: f.fragmentType,
            value: typeof f.value === 'number' ? f.value : '',
            unit: typeof f.value === 'string' ? f.value : f.type,
            isActive: true
        }));

        const cardAction = new PushCardDisplayAction({
            id: `card-${block.key}`,
            ownerId: block.key.toString(),
            type: 'active-block',
            title: this.direction === 'down' ? 'AMRAP' : 'For Time',
            subtitle: this.label,
            metrics: fragmentMetrics
        });

        return [timerAction, cardAction];
    }

    /**
     * Creates actions to clean up display when timer is popped.
     */
    cleanup(block: IRuntimeBlock): IRuntimeAction[] {
        return [
            new PopTimerDisplayAction(`timer-${block.key}`),
            new PopCardDisplayAction(`card-${block.key}`)
        ];
    }

    /**
     * Gets the memory reference for the timer state.
     */
    getTimerRef(): TypedMemoryReference<TimerState> | undefined {
        return this.timerRef;
    }

    /**
     * Updates the timer state with new spans and running status.
     */
    updateState(runtime: IScriptRuntime | undefined, spans: TimerSpan[], isRunning: boolean): void {
        if (!this.timerRef) return;

        const state = this.timerRef.get();
        if (!state) return;

        this.timerRef.set({
            ...state,
            spans,
            isRunning
        });

        if (runtime) {
            // Re-calculate safely
            // Filter to only closed spans for accumulated
            const closedSpans = spans.filter(s => s.stop !== undefined);
            const acc = calculateDuration(closedSpans.map(s => ({ start: s.start, stop: s.stop! })), 0);
            
            // Find current running span start
            const runningSpan = spans.find(s => !s.stop);
            const currentStartTime = runningSpan ? runningSpan.start : undefined;

            new UpdateTimerDisplayAction(`timer-${state.blockId}`, {
                accumulatedMs: acc,
                startTime: currentStartTime,
                isRunning: isRunning
            }).do(runtime);
        }
    }

    /**
     * Resets the timer state in memory.
     */
    resetState(): void {
        if (!this.timerRef) return;

        const state = this.timerRef.get();
        if (state) {
            this.timerRef.set({
                ...state,
                spans: [],
                isRunning: false
            });
        }
    }
}
