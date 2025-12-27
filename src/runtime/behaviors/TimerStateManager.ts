import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IRuntimeAction } from '../IRuntimeAction';
import { RuntimeSpan, RUNTIME_SPAN_TYPE, TimerDisplayConfig } from '../models/RuntimeSpan';
import { TimeSpan } from '../models/TimeSpan';

import { TypedMemoryReference } from '../IMemoryReference';
import { PushTimerDisplayAction, PopTimerDisplayAction, UpdateTimerDisplayAction } from '../actions/TimerDisplayActions';
import { PushCardDisplayAction, PopCardDisplayAction } from '../actions/CardDisplayActions';

/**
 * TimerStateManager handles the memory state and display actions for a timer.
 */
export class TimerStateManager {
    private timerRef?: TypedMemoryReference<RuntimeSpan>;

    constructor(
        private readonly direction: 'up' | 'down',
        private readonly durationMs: number | undefined,
        private readonly label: string
    ) { }

    /**
     * Initializes the timer state in memory and creates display actions.
     * @param runtime The script runtime context
     * @param block The runtime block being initialized
     * @param startTime The timer start timestamp (epoch milliseconds)
     * @param role Optional semantic role for the timer ('root', 'segment', or 'leaf')
     * @returns Array of runtime actions to push timer and card display entries
     */
    initialize(runtime: IScriptRuntime, block: IRuntimeBlock, startTime: number, role: 'primary' | 'secondary' | 'auto' = 'auto', autoStart: boolean = true): IRuntimeAction[] {
        // Determine default role if 'auto'
        let finalRole = role;
        if (role === 'auto') {
            // Default: Countdown = Primary (lock view), Countup = Auto (stack based)
            finalRole = this.direction === 'down' ? 'primary' : 'auto';
        }

        const timerConfig: TimerDisplayConfig = {
            format: this.direction === 'down' ? 'down' : 'up',
            durationMs: this.durationMs,
            label: this.label,
            card: {
                title: this.direction === 'down' ? 'AMRAP' : 'For Time',
                subtitle: this.label
            },
            role: finalRole
        };

        const span = new RuntimeSpan(
            block.key.toString(),
            block.sourceIds || [],
            autoStart ? [new TimeSpan(startTime)] : [],
            block.fragments || [],
            undefined,
            undefined,
            undefined,
            timerConfig
        );

        this.timerRef = runtime.memory.allocate<RuntimeSpan>(
            RUNTIME_SPAN_TYPE,
            block.key.toString(),
            span,
            'public'
        );

        const timerAction = new PushTimerDisplayAction({
            id: `timer-${block.key}`,
            ownerId: block.key.toString(),
            timerMemoryId: this.timerRef.id,
            label: this.label,
            format: this.direction === 'down' ? 'down' : 'up',
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
    getTimerRef(): TypedMemoryReference<RuntimeSpan> | undefined {
        return this.timerRef;
    }

    /**
     * Updates the timer state with new spans and running status.
     */
    updateState(runtime: IScriptRuntime | undefined, spans: TimeSpan[], _isRunning: boolean): void {
        if (!this.timerRef) return;

        const span = this.timerRef.get();
        if (!span) return;

        // Create new instance to ensure reactivity if needed, or just mutate and set
        // RuntimeSpan is a class, so we should probably clone or just set the properties if we want to trigger updates
        // memory.set triggers the event.

        // We assume 'spans' passed in are the updated list (references to TimeSpan objects)
        span.spans = spans;

        this.timerRef.set(span);

        if (runtime) {
            // Calculate accumulated time from CLOSED spans for UI interpolation
            // If active, the last span is open and handled by the UI using startTime
            const active = span.isActive();
            const spans = span.spans;
            const closedSpans = active ? spans.slice(0, -1) : spans;
            const accumulated = closedSpans.reduce((acc, s) => acc + s.duration, 0);

            const lastSpan = spans.length > 0 ? spans[spans.length - 1] : undefined;
            const currentStart = active ? lastSpan?.started : undefined;

            new UpdateTimerDisplayAction(`timer-${span.blockId}`, {
                accumulatedMs: accumulated,
                startTime: currentStart,
                isRunning: active
            }).do(runtime);
        }
    }

    /**
     * Resets the timer state in memory.
     */
    resetState(): void {
        if (!this.timerRef) return;

        const span = this.timerRef.get();
        if (span) {
            span.reset();
            this.timerRef.set(span);
        }
    }
}
