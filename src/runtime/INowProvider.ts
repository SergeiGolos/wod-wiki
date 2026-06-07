/**
 * INowProvider — the only seam for "what time is it" in the runtime.
 * Events, actions, and behaviors that need a timestamp take a now-fn
 * in their constructor; the runtime passes its single provider down.
 * Tests pass a frozen clock so the timeline is deterministic.
 */
export interface INowProvider {
    now(): Date;
    nowMs(): number;
}

/** Default provider: reads wall clock. */
export const wallClockNow: INowProvider = {
    now: () => new Date(),
    nowMs: () => Date.now(),
};

/** A provider that always returns the same Date (for tests). */
export function frozenNow(at: Date): INowProvider {
    return { now: () => at, nowMs: () => at.getTime() };
}
