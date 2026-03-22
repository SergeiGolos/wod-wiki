/**
 * State Transitions Compliance Tests
 *
 * Based on: docs/finishline/compliance-scenarios/state-transitions.md
 *
 * Covers Clock-Driven and User-Driven state transition scenarios,
 * step-by-step, matching the spec tables.
 *
 * Legend:
 *   🟢 Expected to pass — behaviour is fully implemented
 *   🔴 Expected to FAIL (RED) — behaviour is not yet implemented
 */
import { describe, it, expect, afterEach } from 'bun:test';
import {
    createSessionContext,
    startSession,
    userNext,
    advanceClock,
    simulateEvent,
    disposeSession,
    type SessionTestContext,
} from '../jit-compilation/helpers/session-test-utils';
import { TimerState } from '@/runtime/memory/MemoryTypes';
import { calculateElapsed } from '@/runtime/time/calculateElapsed';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currentBlockType(ctx: SessionTestContext): string | undefined {
    return ctx.runtime.stack.current?.blockType;
}

/**
 * Returns the elapsed active time (ms) for the timer on the current block.
 * Uses calculateElapsed with the current clock timestamp.
 */
function currentTimerElapsedMs(ctx: SessionTestContext): number | undefined {
    const block = ctx.runtime.stack.current;
    if (!block) return undefined;
    const timeLoc = block.getMemoryByTag('time')[0];
    const timer = timeLoc?.metrics[0]?.value as TimerState | undefined;
    if (!timer) return undefined;
    return calculateElapsed(timer, ctx.clock.now.getTime());
}

/**
 * Returns true if the current timer is paused (last span has ended set).
 */
function isTimerPaused(ctx: SessionTestContext): boolean {
    const block = ctx.runtime.stack.current;
    if (!block) return false;
    const timeLoc = block.getMemoryByTag('time')[0];
    const timer = timeLoc?.metrics[0]?.value as TimerState | undefined;
    if (!timer || timer.spans.length === 0) return false;
    const lastSpan = timer.spans[timer.spans.length - 1];
    return lastSpan.ended !== undefined;
}

// ===========================================================================
// 🟢 Pause / Resume
// Spec: state-transitions.md#-pause--resume-skip
// ===========================================================================
describe('🟢 Pause / Resume', () => {
    const SCRIPT = '5:00 Run';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: userNext → timer running', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'PauseResume' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/timer/i);
    });

    it('step 2: advanceClock(120_000) → elapsed = 120s', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'PauseResume' });
        userNext(ctx);
        advanceClock(ctx, 120_000);
        expect(currentTimerElapsedMs(ctx)).toBe(120_000);
    });

    it('step 3: simulateEvent("timer:pause") → timer paused', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'PauseResume' });
        userNext(ctx);
        advanceClock(ctx, 120_000);
        simulateEvent(ctx, 'timer:pause');
        expect(isTimerPaused(ctx)).toBe(true);
    });

    it('step 4: advanceClock(60_000) while paused → elapsed still 120s', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'PauseResume' });
        userNext(ctx);
        advanceClock(ctx, 120_000);
        simulateEvent(ctx, 'timer:pause');
        advanceClock(ctx, 60_000);
        // Elapsed should still be 120s — paused time does not count
        expect(currentTimerElapsedMs(ctx)).toBe(120_000);
    });

    it('step 5: simulateEvent("timer:resume") → timer resumes (no longer paused)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'PauseResume' });
        userNext(ctx);
        advanceClock(ctx, 120_000);
        simulateEvent(ctx, 'timer:pause');
        advanceClock(ctx, 60_000);
        simulateEvent(ctx, 'timer:resume');
        expect(isTimerPaused(ctx)).toBe(false);
    });

    it('step 6: advanceClock(180_000) after resume → elapsed = 300s and timer expires', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'PauseResume' });
        userNext(ctx);                          // start timer
        advanceClock(ctx, 120_000);             // run 120s
        simulateEvent(ctx, 'timer:pause');      // pause at 120s
        advanceClock(ctx, 60_000);              // 60s of paused wall time
        simulateEvent(ctx, 'timer:resume');     // resume
        advanceClock(ctx, 180_000);             // run 180s more → 120+180 = 300s = 5:00

        // Timer should have expired (stack empty — only SessionRoot was left and it auto-pops)
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Exact Boundary Expiry
// Spec: state-transitions.md#-exact-boundary-expiry
// ===========================================================================
describe('🟢 Exact Boundary Expiry', () => {
    const SCRIPT = '1:00 Row';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: userNext → timer running', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ExactBoundary' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/timer/i);
    });

    it('step 2: advanceClock(60_000) → expires at exactly 60s, no overshoot', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ExactBoundary' });
        userNext(ctx);
        advanceClock(ctx, 60_000);
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Past-Boundary Expiry
// Spec: state-transitions.md#-past-boundary-expiry
// ===========================================================================
describe('🟢 Past-Boundary Expiry', () => {
    const SCRIPT = '1:00 Row';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: userNext → timer running', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'PastBoundary' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/timer/i);
    });

    it('step 2: advanceClock(75_000) → expires, no error from overshooting by 15s', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'PastBoundary' });
        userNext(ctx);
        advanceClock(ctx, 75_000);
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Incremental vs. Bulk Advance
// Spec: state-transitions.md#-incremental-vs-bulk-advance
// ===========================================================================
describe('🟢 Incremental vs. Bulk Advance', () => {
    const SCRIPT = '1:00 Row';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('Test A: 10 × advanceClock(6_000) → timer expires after 10th advance', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'IncrementalA' });
        userNext(ctx);
        for (let i = 0; i < 10; i++) {
            advanceClock(ctx, 6_000);
        }
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('Test B: 1 × advanceClock(60_000) → identical outcome to Test A', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'IncrementalB' });
        userNext(ctx);
        advanceClock(ctx, 60_000);
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 userNext on Effort → Parent Pushes Next Child
// Spec: state-transitions.md#-usernext-on-effort--parent-pushes-next-child
// ===========================================================================
describe('🟢 userNext on Effort → Parent Pushes Next Child', () => {
    const SCRIPT = '(2)\n  10 Pullups\n  15 Pushups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: userNext → child 1 (Pullups) on stack', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ParentNextChild' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('step 2: userNext → parent auto-pushes next child (Pushups)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ParentNextChild' });
        userNext(ctx); // Pullups
        userNext(ctx); // Pushups auto-pushed
        expect(currentBlockType(ctx)).toMatch(/effort/i);
        expect(ctx.runtime.stack.count).toBeGreaterThan(1);
    });
});

// ===========================================================================
// 🟢 userNext on Last Child → Round Increments
// Spec: state-transitions.md#-usernext-on-last-child--round-increments
// ===========================================================================
describe('🟢 userNext on Last Child → Round Increments', () => {
    const SCRIPT = '(3)\n  10 Pullups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: userNext → R1 (Pullups)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'RoundIncrement' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/effort/i);
        expect(ctx.runtime.stack.count).toBeGreaterThan(0);
    });

    it('steps 1-4: 3 rounds cycle through and stack empties', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'RoundIncrement' });
        userNext(ctx); // R1
        userNext(ctx); // R2
        userNext(ctx); // R3
        userNext(ctx); // exhausted
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 userNext on Empty Stack — Graceful No-Op
// Spec: state-transitions.md#-usernext-on-empty-stack--graceful-no-op
// ===========================================================================
describe('🟢 userNext on Empty Stack — Graceful No-Op', () => {
    const SCRIPT = '10 Pullups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('userNext on empty stack → no crash, depth stays 0', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'EmptyStackNoOp' });
        userNext(ctx); // start
        userNext(ctx); // complete

        expect(ctx.runtime.stack.count).toBe(0);

        // Extra userNext on empty stack — must not throw
        expect(() => userNext(ctx)).not.toThrow();
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Rapid Double userNext
// Spec: state-transitions.md#-rapid-double-usernext
// ===========================================================================
describe('🟢 Rapid Double userNext', () => {
    const SCRIPT = '10 Pullups\n15 Pushups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: userNext → Effort("Pullups") on stack', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'RapidNext' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('step 2: second userNext → Pullups pops, Pushups pushed', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'RapidNext' });
        userNext(ctx); // Pullups
        userNext(ctx); // Pushups
        expect(currentBlockType(ctx)).toMatch(/effort/i);
        expect(ctx.runtime.stack.count).toBeGreaterThan(0);
    });

    it('step 3: third userNext immediately → clean termination, no duplicate pop', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'RapidNext' });
        userNext(ctx); // Pullups
        userNext(ctx); // Pushups
        userNext(ctx); // terminate
        expect(ctx.runtime.stack.count).toBe(0);
    });
});
