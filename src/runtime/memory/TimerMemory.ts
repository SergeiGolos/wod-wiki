import { BaseMemoryEntry } from './BaseMemoryEntry';
import { TimerState, TimerDirection } from './MemoryTypes';
import { TimeSpan } from '../models/TimeSpan';

/**
 * Memory implementation for timer state.
 * Tracks raw spans and display configuration.
 */
export class TimerMemory extends BaseMemoryEntry<'timer', TimerState> {
    constructor(options: {
        direction: TimerDirection;
        label: string;
        durationMs?: number;
        role?: 'primary' | 'secondary' | 'auto';
        initialSpans?: TimeSpan[];
    }) {
        super('timer', {
            spans: options.initialSpans ?? [],
            durationMs: options.durationMs,
            direction: options.direction,
            label: options.label,
            role: options.role
        });
    }

    /**
     * Whether the timer is currently running (has an open span).
     */
    get isRunning(): boolean {
        return this._value.spans.length > 0 && this._value.spans[this._value.spans.length - 1].isOpen;
    }

    /**
     * Adds a new time span, starting the timer.
     */
    start(timestamp: number = Date.now()): void {
        if (this.isRunning) return;

        const newSpans = [...this._value.spans, new TimeSpan(timestamp)];
        this.update({
            ...this._value,
            spans: newSpans
        });
    }

    /**
     * Closes the active time span, pausing the timer.
     */
    stop(timestamp: number = Date.now()): void {
        if (!this.isRunning) return;

        const newSpans = [...this._value.spans];
        const lastSpan = newSpans[newSpans.length - 1];

        // Create a new instance with the end time set
        newSpans[newSpans.length - 1] = new TimeSpan(lastSpan.started, timestamp);

        this.update({
            ...this._value,
            spans: newSpans
        });
    }

    /**
     * Resets the timer state.
     */
    reset(): void {
        this.update({
            ...this._value,
            spans: []
        });
    }
}
