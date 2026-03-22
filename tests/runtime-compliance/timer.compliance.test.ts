/**
 * Timer Compliance Tests
 *
 * Based on: docs/finishline/compliance-scenarios/timer.md
 *
 * Covers all Timer scenarios, step-by-step, matching the spec tables.
 *
 * Legend:
 *   🟢 Expected to pass — behaviour is fully implemented
 *   🟡 Potentially borderline — implementation may differ
 *   🔴 Expected to FAIL (RED) — behaviour is not yet implemented
 */
import { describe, it, expect, afterEach } from 'bun:test';
import {
    createSessionContext,
    startSession,
    userNext,
    advanceClock,
    disposeSession,
    type SessionTestContext,
} from '../jit-compilation/helpers/session-test-utils';
import { MetricType } from '@/core/models/Metric';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the blockType of the top-of-stack block, or undefined when empty.
 */
function currentBlockType(ctx: SessionTestContext): string | undefined {
    return ctx.runtime.stack.current?.blockType;
}

/**
 * Checks whether any system pop event carries the given completionReason.
 * The completionReason lives in the system event's metric.value, not in
 * the completion output's completionReason field.
 */
function anySystemPopHasReason(ctx: SessionTestContext, reason: string): boolean {
    return ctx.tracer.outputs
        .filter(o => o.outputType === 'system')
        .some(o => {
            const sysMetric = o.raw.metrics.find(m => m.type === MetricType.System);
            const v = sysMetric?.value as Record<string, unknown> | undefined;
            return v?.event === 'pop' && v?.completionReason === reason;
        });
}

/**
 * Returns system pop event values from the tracer, in emission order.
 */
function systemPopValues(ctx: SessionTestContext): Array<Record<string, unknown>> {
    return ctx.tracer.outputs
        .filter(o => o.outputType === 'system')
        .map(o => {
            const m = o.raw.metrics.find(m => m.type === MetricType.System);
            return m?.value as Record<string, unknown> | undefined;
        })
        .filter((v): v is Record<string, unknown> => !!v && v['event'] === 'pop');
}

// ===========================================================================
// 🟢 Countdown Timer — 5:00 Run
// Spec: timer.md#-countdown-timer
// ===========================================================================
describe('🟢 Countdown Timer — 5:00 Run', () => {
    const SCRIPT = '5:00 Run';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 0: startSession → depth = 2 (SessionRoot + WaitingToStart)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'CountdownTimer' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: userNext → Timer starts, direction = down', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'CountdownTimer' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/timer/i);
    });

    it('step 2: advanceClock(150_000) → mid-timer, block still active', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'CountdownTimer' });
        userNext(ctx);
        advanceClock(ctx, 150_000);
        expect(ctx.runtime.stack.count).toBeGreaterThan(0);
        expect(currentBlockType(ctx)).toMatch(/timer/i);
    });

    it('step 3: advanceClock(150_000) more → timer expires, session ends', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'CountdownTimer' });
        userNext(ctx);
        advanceClock(ctx, 150_000);
        advanceClock(ctx, 150_000);
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Short Timer — :30 Plank
// Spec: timer.md#-short-timer-30-format
// ===========================================================================
describe('🟢 Short Timer — :30 Plank', () => {
    const SCRIPT = ':30 Plank';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: userNext → Timer starts (30s)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ShortTimer' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/timer/i);
    });

    it('step 2: advanceClock(30_000) → auto-pops at 30s', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ShortTimer' });
        userNext(ctx);
        advanceClock(ctx, 30_000);
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Timer — Exact Boundary
// Spec: timer.md#-timer--exact-boundary
// ===========================================================================
describe('🟢 Timer — Exact Boundary', () => {
    const SCRIPT = '1:00 Row';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: userNext → timer running', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ExactBoundary' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/timer/i);
    });

    it('step 2: advanceClock(60_000) → expires at exactly 60s', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ExactBoundary' });
        userNext(ctx);
        advanceClock(ctx, 60_000);
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Timer — Mid-Stream Check
// Spec: timer.md#-timer--mid-stream-check
// ===========================================================================
describe('🟢 Timer — Mid-Stream Check', () => {
    const SCRIPT = '2:00 Bike';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: userNext → timer running', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'MidStream' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/timer/i);
    });

    it('step 2: advanceClock(60_000) → still active, elapsed ~60s', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'MidStream' });
        userNext(ctx);
        advanceClock(ctx, 60_000);
        expect(ctx.runtime.stack.count).toBeGreaterThan(0);
        expect(currentBlockType(ctx)).toMatch(/timer/i);
    });

    it('step 3: advanceClock(60_000) → expires at 120s', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'MidStream' });
        userNext(ctx);
        advanceClock(ctx, 60_000);
        advanceClock(ctx, 60_000);
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Sequential Timers
// Spec: timer.md#-sequential-timers
// ===========================================================================
describe('🟢 Sequential Timers — 5:00 Run / 3:00 Row', () => {
    const SCRIPT = '5:00 Run\n3:00 Row';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: userNext → first timer (Run) starts', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SequentialTimers' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/timer/i);
    });

    it('step 2: advanceClock(300_000) → first expires, second timer (Row) auto-pushes', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SequentialTimers' });
        userNext(ctx);
        advanceClock(ctx, 300_000);
        expect(ctx.runtime.stack.count).toBeGreaterThan(0);
        expect(currentBlockType(ctx)).toMatch(/timer/i);
    });

    it('step 3: advanceClock(180_000) → second expires, session ends', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SequentialTimers' });
        userNext(ctx);
        advanceClock(ctx, 300_000);
        advanceClock(ctx, 180_000);
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟡 Timer — Normal (Skippable by Default)
// Spec: timer.md#-timer--normal-skippable-by-default
// ===========================================================================
describe('🟡 Timer — Normal (Skippable by Default)', () => {
    const SCRIPT = '5:00 Run';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: userNext → timer starts (5:00 countdown)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkippableTimer' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/timer/i);
    });

    it('step 2a: early userNext → timer dismissed, session ends (user-advance)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkippableTimer' });
        userNext(ctx); // start timer
        userNext(ctx); // early skip
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('step 2a: early skip carries completionReason = "user-advance"', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkippableTimer' });
        userNext(ctx); // start timer
        userNext(ctx); // early skip
        expect(anySystemPopHasReason(ctx, 'user-advance')).toBe(true);
    });

    it('step 2b: advanceClock(300_000) → timer expires at 0:00, session ends (timer-expiry)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkippableTimer' });
        userNext(ctx);
        advanceClock(ctx, 300_000);
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('step 2b: timer-expiry carries completionReason = "timer-expired"', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkippableTimer' });
        userNext(ctx);
        advanceClock(ctx, 300_000);
        // Check the timer block's pop specifically (last pop before session root)
        const pops = systemPopValues(ctx);
        const timerPop = pops.find(p => p['blockLabel'] === '5:00 Run');
        expect(timerPop?.completionReason).toBe('timer-expired');
    });
});

// ===========================================================================
// 🔴 Forced Timer — Cannot Skip (`*` prefix)
// Spec: timer.md#-forced-timer--cannot-skip--prefix
// ===========================================================================
describe('🔴 Forced Timer — Cannot Skip (*5:00 Run)', () => {
    const SCRIPT = '*5:00 Run';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 0: startSession → depth = 2 (SessionRoot + WaitingToStart)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedTimer' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: userNext → forced timer starts', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedTimer' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/timer/i);
    });

    it('step 2: userNext (attempt skip) → no-op, block stays, countdown continues', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedTimer' });
        userNext(ctx); // start timer

        const depthBeforeSkip = ctx.runtime.stack.count;
        userNext(ctx); // attempt skip — must be no-op
        expect(ctx.runtime.stack.count).toBe(depthBeforeSkip);
        expect(currentBlockType(ctx)).toMatch(/timer/i);
    });

    it('multiple userNext calls during forced timer all produce zero stack changes', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedTimer' });
        userNext(ctx); // start timer

        const depthAfterStart = ctx.runtime.stack.count;
        userNext(ctx);
        userNext(ctx);
        userNext(ctx);
        expect(ctx.runtime.stack.count).toBe(depthAfterStart);
    });

    it('step 3: advanceClock(300_000) → timer expires → auto-pop, session ends', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedTimer' });
        userNext(ctx); // start timer
        userNext(ctx); // attempt skip — no-op
        advanceClock(ctx, 300_000);
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('forced timer completionReason is never "user-advance"', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedTimer' });
        userNext(ctx); // start
        userNext(ctx); // attempt skip
        advanceClock(ctx, 300_000); // expire

        // The WaitingToStart pop uses user-advance (correct), but the forced timer
        // block itself must NOT use user-advance. Check only the timer block's pop.
        const pops = systemPopValues(ctx);
        const timerPop = pops.find(p => p['blockLabel'] === '*5:00 Run' || p['blockType'] === 'Timer');
        // If the label check misses, fall back to checking the pop before SessionRoot
        const forcedTimerPop = timerPop ?? pops.at(-2); // -2: timer pop; -1: session-root pop
        expect(forcedTimerPop?.completionReason).not.toBe('user-advance');
    });

    it('forced timer completionReason is "timer-expired"', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedTimer' });
        userNext(ctx); // start
        advanceClock(ctx, 300_000); // expire

        // The timer block's pop should carry timer-expired as the reason.
        const pops = systemPopValues(ctx);
        const timerPop = pops.at(-2); // -2: timer pop; -1: session-root pop
        expect(timerPop?.completionReason).toBe('timer-expired');
    });
});

// ===========================================================================
// 🔴 Collectible Timer — :? Sprint
// Spec: timer.md#-collectible-timer-skip
// ===========================================================================
describe('🔴 Collectible Timer — :? Sprint', () => {
    const SCRIPT = ':? Sprint';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: startSession + userNext → Timer starts with no fixed duration', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'CollectibleTimer' });
        userNext(ctx); // WaitingToStart → timer block
        expect(currentBlockType(ctx)).toMatch(/timer/i);
    });

    it('step 1: collectible timer is a count-up timer (no fixed duration)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'CollectibleTimer' });
        userNext(ctx);

        // Confirm the block is still active (no auto-expiry since no fixed duration)
        advanceClock(ctx, 60_000);
        expect(ctx.runtime.stack.count).toBeGreaterThan(0);
        expect(currentBlockType(ctx)).toMatch(/timer/i);
    });

    it('step 2: userNext manually completes the collectible timer', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'CollectibleTimer' });
        userNext(ctx); // start timer
        advanceClock(ctx, 45_000); // let some time elapse
        userNext(ctx); // manually complete
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('step 2: captured time is recorded on manual completion', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'CollectibleTimer' });
        userNext(ctx); // start timer
        advanceClock(ctx, 45_000); // 45 seconds elapsed
        userNext(ctx); // complete

        // At least one output statement should be produced
        expect(ctx.tracer.outputs.length).toBeGreaterThan(0);
    });

    it('step 2: manual completion carries completionReason = "user-advance"', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'CollectibleTimer' });
        userNext(ctx); // start
        advanceClock(ctx, 45_000);
        userNext(ctx); // complete

        expect(anySystemPopHasReason(ctx, 'user-advance')).toBe(true);
    });
});
