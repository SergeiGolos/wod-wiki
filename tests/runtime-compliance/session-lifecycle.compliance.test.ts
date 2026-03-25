/**
 * Session Lifecycle Compliance Tests
 *
 * Based on: docs/finishline/compliance-scenarios/session-lifecycle.md
 *
 * Covers all session lifecycle scenarios, step-by-step, matching the spec tables.
 *
 * Legend:
 *   🟢 Expected to pass — behaviour is fully implemented
 *   🔴 Expected to FAIL (RED) — behaviour is not yet implemented
 *
 * Scenarios covered:
 *   🟢 Full Session — Start to Finish (Effort)
 *   🟢 Full Session — Timer Auto-Complete
 *   🟢 Full Session — Multi-Block
 *   🟢 Early Termination / Abort (.skip)
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currentBlockType(ctx: SessionTestContext): string | undefined {
    return ctx.runtime.stack.current?.blockType;
}

// ===========================================================================
// 🟢 Full Session — Start to Finish (Effort)
// Spec: session-lifecycle.md#-full-session--start-to-finish-effort
//
// 10 Pullups
// Step 0: startSession → SessionRoot · WaitingToStart (depth = 2)
// Step 1: userNext       → SessionRoot · Effort (WaitingToStart completes)
// Step 2: userNext       → session ends (depth = 0)
// ===========================================================================
describe('🟢 Full Session — Start to Finish (Effort)', () => {
    const SCRIPT = '10 Pullups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 0: startSession → depth = 2 (SessionRoot + WaitingToStart)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Effort' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: first userNext → WaitingToStart pops, Effort block mounts (depth = 2)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Effort' });
        userNext(ctx);
        expect(ctx.runtime.stack.count).toBe(2);
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('step 2: second userNext → session ends (depth = 0)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Effort' });
        userNext(ctx); // dismiss WaitingToStart → Effort mounts
        userNext(ctx); // Effort completes → session ends
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('all outputs are paired (segment + completion for every block)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Effort' });
        userNext(ctx);
        userNext(ctx);
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});

// ===========================================================================
// 🟢 Full Session — Timer Auto-Complete
// Spec: session-lifecycle.md#-full-session--timer-auto-complete
//
// 1:00 Row
// Step 0: startSession          → SessionRoot · WaitingToStart (2 segments)
// Step 1: userNext              → SessionRoot · Timer (WaitingToStart completes)
// Step 2: advanceClock(60_000)  → Timer expires → session ends
// ===========================================================================
describe('🟢 Full Session — Timer Auto-Complete', () => {
    const SCRIPT = '1:00 Row';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 0: startSession → depth = 2', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'TimerAuto' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: userNext → Timer starts (no userNext needed to end)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'TimerAuto' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/timer/i);
    });

    it('step 2: advanceClock(60_000) → timer expires, session auto-terminates (depth = 0)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'TimerAuto' });
        userNext(ctx);
        advanceClock(ctx, 60_000);
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('all outputs are paired (no userNext needed to end)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'TimerAuto' });
        userNext(ctx);
        advanceClock(ctx, 60_000);
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});

// ===========================================================================
// 🟢 Full Session — Multi-Block
// Spec: session-lifecycle.md#-full-session--multi-block
//
// (3)
//   10 Pullups
//   15 Pushups
// ===========================================================================
describe('🟢 Full Session — Multi-Block', () => {
    const SCRIPT = '(3)\n  10 Pullups\n  15 Pushups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 0: startSession → depth = 2', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'MultiBlock' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('dismiss gate: first userNext → depth = 3 (Rounds + child 1 on stack)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'MultiBlock' });
        userNext(ctx);
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(3);
    });

    it('output count grows with each userNext during rounds', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'MultiBlock' });
        userNext(ctx); // dismiss gate → R1 child1
        const countAfterStart = ctx.tracer.count;
        userNext(ctx); // R1 child1 → R1 child2
        expect(ctx.tracer.count).toBeGreaterThan(countAfterStart);
    });

    it('session ends cleanly after all 3 rounds complete', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'MultiBlock' });
        userNext(ctx); // dismiss gate
        // 3 rounds × 2 children = 6 exercise completions
        for (let r = 0; r < 3; r++) {
            userNext(ctx); // child 1
            userNext(ctx); // child 2
        }
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('output count is at least 16 (rounds + children + session)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'MultiBlock' });
        userNext(ctx);
        for (let r = 0; r < 3; r++) {
            userNext(ctx);
            userNext(ctx);
        }
        expect(ctx.tracer.count).toBeGreaterThanOrEqual(16);
    });

    it('all outputs are paired', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'MultiBlock' });
        userNext(ctx);
        for (let r = 0; r < 3; r++) {
            userNext(ctx);
            userNext(ctx);
        }
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});

// ===========================================================================
// 🟢 Early Termination / Abort (.skip)
// Spec: session-lifecycle.md#-early-termination--abort-skip
//
// 20:00 AMRAP
//   5 Pullups
//   10 Pushups
//
// Steps 1-3: normal start, do 1 round → AMRAP running
// Step 4:    simulateEvent('abort')   → AMRAP force-pops
// Step 5:    —                        → stack empties, open segments closed
// Step 6:    —                        → assertPairedOutputs() passes
// ===========================================================================
describe('🟢 Early Termination / Abort (.skip)', () => {
    const SCRIPT = '20:00 AMRAP\n  5 Pullups\n  10 Pushups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: startSession → AMRAP setup visible (depth = 2)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AbortAMRAP' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 2: userNext starts AMRAP and pushes first exercise', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AbortAMRAP' });
        userNext(ctx);
        // WaitingToStart popped; AMRAP block + first exercise on stack
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(3);
        const amrapBlock = ctx.runtime.stack.blocks.find(b => b.blockType === 'AMRAP');
        expect(amrapBlock).toBeDefined();
    });

    it('step 3: complete 1 round (Pullups + Pushups) → AMRAP still running', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AbortAMRAP' });
        userNext(ctx); // start AMRAP
        advanceClock(ctx, 60_000);
        userNext(ctx); // Pullups done
        userNext(ctx); // Pushups done → round 2 starts
        // AMRAP is still on the stack (timer has not expired)
        const amrapBlock = ctx.runtime.stack.blocks.find(b => b.blockType === 'AMRAP');
        expect(amrapBlock).toBeDefined();
    });

    it('step 4: simulateEvent("abort") → AMRAP force-pops, stack empties', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AbortAMRAP' });
        userNext(ctx); // start AMRAP
        advanceClock(ctx, 60_000);
        userNext(ctx); // Pullups
        userNext(ctx); // Pushups → round 2
        simulateEvent(ctx, 'abort');
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('step 5: abort on a fresh session (no rounds done) also empties stack', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AbortFresh' });
        userNext(ctx); // start AMRAP
        simulateEvent(ctx, 'abort');
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('step 6: assertPairedOutputs() passes after abort', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AbortAMRAP' });
        userNext(ctx); // start AMRAP
        advanceClock(ctx, 60_000);
        userNext(ctx); // Pullups
        userNext(ctx); // Pushups → round 2
        simulateEvent(ctx, 'abort');
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });

    it('abort on an already-empty stack is a no-op (no crash)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AbortEmpty' });
        userNext(ctx); // start AMRAP
        simulateEvent(ctx, 'abort'); // first abort → drains stack
        simulateEvent(ctx, 'abort'); // second abort → should be safe no-op
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('abort without ever starting session → no crash', () => {
        ctx = createSessionContext(SCRIPT);
        simulateEvent(ctx, 'abort');
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('outputs are emitted for all blocks present at time of abort', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AbortOutputs' });
        userNext(ctx); // start → WaitingToStart completes, AMRAP + Pullups pushed
        const countBeforeAbort = ctx.tracer.count;
        simulateEvent(ctx, 'abort');
        // Additional completion outputs should have been emitted during abort
        expect(ctx.tracer.count).toBeGreaterThan(countBeforeAbort);
    });
});
