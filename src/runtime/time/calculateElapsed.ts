import { TimerState } from '../memory/MemoryTypes';

/**
 * Calculates total elapsed time from timer spans.
 *
 * Iterates the span list, summing (end - start) for each span.
 * Open spans (no `ended`) use `now` as the end timestamp.
 *
 * This is the canonical elapsed time computation — all behaviors
 * that need pause-aware elapsed should use this function.
 *
 * @param timer The timer state containing spans
 * @param now Current timestamp in milliseconds for open spans
 * @returns Total elapsed time in milliseconds
 */
export function calculateElapsed(timer: TimerState, now: number): number {
    let total = 0;
    for (const span of timer.spans) {
        const end = span.ended ?? now;
        total += end - span.started;
    }
    return total;
}

/**
 * Formats milliseconds as mm:ss.
 *
 * @param ms Duration in milliseconds
 * @returns Formatted string like "5:03"
 */
export function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
