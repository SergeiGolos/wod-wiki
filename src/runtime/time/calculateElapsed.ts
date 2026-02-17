import { TimerState } from '../memory/MemoryTypes';

/**
 * Calculates **Elapsed** time from timer spans.
 *
 * Iterates the span list, summing (end − start) for each span.
 * Open spans (no `ended`) use `now` as the end timestamp.
 *
 * This is the canonical Elapsed computation — all behaviors
 * that need pause-aware active time should use this function.
 *
 * ## Glossary (docs/architecture/time-terminology.md)
 * - **Elapsed** = Σ(end − start) per span (this function)
 * - **Total** = lastEnd − firstStart (computed elsewhere)
 *
 * @param timer The timer state containing the Time spans
 * @param now Current timestamp in milliseconds for open spans
 * @returns Elapsed time in milliseconds (active only, excludes pauses)
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
 * Formats milliseconds as mm:ss for display.
 *
 * @param ms Duration or Elapsed value in milliseconds
 * @returns Formatted string like "5:03"
 */
export function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
