import { TimeSpan } from '../models/TimeSpan';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { MetricBehavior } from '../../types/MetricBehavior';
import { TimerDirection } from '../memory/MemoryTypes';
import { FragmentBucket } from './FragmentBucket';

/**
 * Encapsulates timer state management: TimeSpan[] tracking,
 * pause/resume, elapsed calculation, and expiry detection.
 *
 * Used as a composition helper (not inheritance) by any typed block
 * that needs a clock (TimerLeafBlock, AmrapBlock, EmomBlock, etc.).
 */
export class TimerCapability {
    private _spans: TimeSpan[] = [];
    readonly direction: TimerDirection;
    readonly durationMs?: number;
    readonly label: string;
    readonly role: 'primary' | 'secondary' | 'auto';

    constructor(config: {
        direction: TimerDirection;
        durationMs?: number;
        label?: string;
        role?: 'primary' | 'secondary' | 'auto';
    }) {
        this.direction = config.direction;
        this.durationMs = config.durationMs;
        this.label = config.label ?? '';
        this.role = config.role ?? 'primary';
    }

    // ========================================================================
    // Span Management
    // ========================================================================

    get spans(): readonly TimeSpan[] {
        return this._spans;
    }

    /** Open a new span at the given time */
    openSpan(now: Date): void {
        this._spans.push(new TimeSpan(now.getTime()));
    }

    /** Close the current open span at the given time */
    closeSpan(now: Date): void {
        const lastSpan = this._spans[this._spans.length - 1];
        if (lastSpan && lastSpan.isOpen) {
            lastSpan.ended = now.getTime();
        }
    }

    /** Close current span then immediately open a new one (pause/resume or reset) */
    pause(now: Date): void {
        this.closeSpan(now);
    }

    resume(now: Date): void {
        this.openSpan(now);
    }

    /** Reset all spans and reopen (used by EMOM interval reset) */
    resetSpans(now: Date): void {
        this._spans = [];
        this.openSpan(now);
    }

    // ========================================================================
    // Elapsed Time Calculation
    // ========================================================================

    /** Sum of all span durations (active time, excludes pauses) */
    getElapsedMs(now: Date): number {
        let total = 0;
        for (const span of this._spans) {
            const end = span.ended ?? now.getTime();
            total += Math.max(0, end - span.started);
        }
        return total;
    }

    /** Check whether the countdown timer has expired */
    isExpired(now: Date): boolean {
        if (!this.durationMs || this.direction !== 'down') return false;
        return this.getElapsedMs(now) >= this.durationMs;
    }

    /** Remaining milliseconds for a countdown (0 if expired or no duration) */
    getRemainingMs(now: Date): number {
        if (!this.durationMs) return 0;
        return Math.max(0, this.durationMs - this.getElapsedMs(now));
    }

    /** Whether there is currently an open span */
    get isRunning(): boolean {
        const last = this._spans[this._spans.length - 1];
        return !!last && last.isOpen;
    }

    // ========================================================================
    // Fragment Helpers
    // ========================================================================

    /** Write current timer state to the fragment bucket as a SpansFragment */
    syncToFragments(bucket: FragmentBucket, now: Date): void {
        const spansFragment: ICodeFragment = {
            fragmentType: FragmentType.Spans,
            type: 'spans',
            image: `${this.getElapsedMs(now)}ms`,
            origin: 'runtime',
            behavior: MetricBehavior.Recorded,
            value: {
                spans: this._spans.map(s => ({ started: s.started, ended: s.ended })),
                direction: this.direction,
                durationMs: this.durationMs,
                label: this.label,
                role: this.role,
            },
            timestamp: now,
        };

        bucket.replaceByType(FragmentType.Spans, [spansFragment]);
    }
}
