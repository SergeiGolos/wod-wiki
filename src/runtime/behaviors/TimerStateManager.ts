import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IRuntimeAction } from '../IRuntimeAction';
import { TimerState, TimerSpan } from '../models/MemoryModels';
import { TypedMemoryReference } from '../IMemoryReference';
import { MemoryTypeEnum } from '../MemoryTypeEnum';
import { PushTimerDisplayAction, PopTimerDisplayAction } from '../actions/TimerDisplayActions';
import { PushCardDisplayAction, PopCardDisplayAction } from '../actions/CardDisplayActions';

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
    initialize(runtime: IScriptRuntime, block: IRuntimeBlock, startTime: number, role?: 'root' | 'segment' | 'leaf'): IRuntimeAction[] {
        const initialState: TimerState = {
            blockId: block.key.toString(),
            label: this.label,
            format: this.direction === 'down' ? 'down' : 'up',
            durationMs: this.durationMs,
            spans: [{ start: startTime, state: 'new' }],
            isRunning: true,
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

        const timerAction = new PushTimerDisplayAction({
            id: `timer-${block.key}`,
            ownerId: block.key.toString(),
            timerMemoryId: this.timerRef.id,
            label: this.label,
            format: this.direction === 'down' ? 'countdown' : 'countup',
            durationMs: this.durationMs,
            role: role
        });

        const cardAction = new PushCardDisplayAction({
            id: `card-${block.key}`,
            ownerId: block.key.toString(),
            type: 'active-block',
            title: this.direction === 'down' ? 'AMRAP' : 'For Time',
            subtitle: this.label,
            metrics: block.compiledMetrics?.values.map(m => ({
                type: m.type,
                value: m.value ?? 0,
                unit: m.unit,
                isActive: true
            }))
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
    updateState(spans: TimerSpan[], isRunning: boolean): void {
        if (!this.timerRef) return;

        const state = this.timerRef.get();
        if (!state) return;

        this.timerRef.set({
            ...state,
            spans,
            isRunning
        });
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
