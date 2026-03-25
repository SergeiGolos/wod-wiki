/**
 * EMOM Compliance Tests
 *
 * Based on: docs/finishline/compliance-scenarios/emom.md
 *
 * Covers all EMOM scenarios, step-by-step, matching the spec tables.
 *
 * Legend:
 *   🟢 Expected to pass — behaviour is fully implemented
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
import { RoundState } from '@/runtime/memory/MemoryTypes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reads the current round state from the EMOM block on the stack.
 * Returns undefined when no EMOM block is present.
 */
function getRoundState(ctx: SessionTestContext): RoundState | undefined {
    const emomBlock = ctx.runtime.stack.blocks.find(b => b.blockType === 'EMOM');
    if (!emomBlock) return undefined;
    return emomBlock.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined;
}

/**
 * Returns the blockType of the currently-active (top-of-stack) block.
 */
function currentBlockType(ctx: SessionTestContext): string | undefined {
    return ctx.runtime.stack.current?.blockType;
}

// ===========================================================================
// 🟢 Basic EMOM — 3 Rounds
// (3) :60 EMOM  5 Pullups
// Spec: docs/finishline/compliance-scenarios/emom.md#-basic-emom--3-rounds
// ===========================================================================
describe('🟢 Basic EMOM — 3 Rounds', () => {
    const SCRIPT = '(3) :60 EMOM\n  5 Pullups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 0: startSession → SessionRoot + WaitingToStart (depth = 2)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'BasicEMOM' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: userNext starts EMOM and pushes 1st exercise (R1)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'BasicEMOM' });
        userNext(ctx);
        // WaitingToStart popped; EMOM block + first exercise now on stack
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(3);
        const emomBlock = ctx.runtime.stack.blocks.find(b => b.blockType === 'EMOM');
        expect(emomBlock).toBeDefined();
    });

    it('step 1: round counter initialises at 1', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'BasicEMOM' });
        userNext(ctx);
        expect(getRoundState(ctx)?.current).toBe(1);
        expect(getRoundState(ctx)?.total).toBe(3);
    });

    it('step 2: advanceClock(60_000) → R1 timer expires, child auto-pops, R2 starts', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'BasicEMOM' });
        userNext(ctx);
        advanceClock(ctx, 60_000);
        // EMOM still on stack, round 2 in progress
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(2);
        expect(getRoundState(ctx)?.current).toBe(2);
    });

    it('step 3: advanceClock(60_000) → R2 expires, R3 starts', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'BasicEMOM' });
        userNext(ctx);
        advanceClock(ctx, 60_000); // R1
        advanceClock(ctx, 60_000); // R2
        expect(getRoundState(ctx)?.current).toBe(3);
    });

    it('step 4: advanceClock(60_000) → R3 expires → rounds exhausted → session ends', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'BasicEMOM' });
        userNext(ctx);
        advanceClock(ctx, 60_000); // R1
        advanceClock(ctx, 60_000); // R2
        advanceClock(ctx, 60_000); // R3
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('all outputs are paired (segment + completion) through 3 timer-driven rounds', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'BasicEMOM' });
        userNext(ctx);
        advanceClock(ctx, 60_000);
        advanceClock(ctx, 60_000);
        advanceClock(ctx, 60_000);
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});

// ===========================================================================
// 🟢 EMOM — Overrun Scenario
// (3) :30 EMOM  10 Heavy Deadlifts
// Timer is authoritative — auto-pops child if user has not called next.
// Spec: docs/finishline/compliance-scenarios/emom.md#-emom--overrun-scenario-skip
// ===========================================================================
describe('🟢 EMOM — Overrun Scenario', () => {
    const SCRIPT = '(3) :30 EMOM\n  10 Heavy Deadlifts';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('timer auto-pops child when :30 expires without user calling next', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Overrun' });
        userNext(ctx); // Start session — R1 child mounted

        // Do NOT call userNext — simulate overrun: 30s elapses before user acts
        advanceClock(ctx, 30_000); // R1 interval expires

        // EMOM must still be alive and on round 2 (child was auto-popped)
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(2);
        expect(getRoundState(ctx)?.current).toBe(2);
    });

    it('round advances even if exercise was not "completed" by user', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Overrun' });
        userNext(ctx);

        // R1: user never calls next → timer forces advancement
        advanceClock(ctx, 30_000);

        // Round must have advanced to 2
        expect(getRoundState(ctx)?.current).toBe(2);
    });

    it('no stuck state — timer is authoritative through all 3 rounds', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Overrun' });
        userNext(ctx);

        // Never call userNext — let timers drive everything
        advanceClock(ctx, 30_000); // R1 expires
        advanceClock(ctx, 30_000); // R2 expires
        advanceClock(ctx, 30_000); // R3 expires → EMOM done → session ends

        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('all outputs paired even when child is auto-popped via overrun', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Overrun' });
        userNext(ctx);

        advanceClock(ctx, 30_000);
        advanceClock(ctx, 30_000);
        advanceClock(ctx, 30_000);

        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });

    it('force-popped child has completionReason "forced-pop"', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Overrun' });
        userNext(ctx); // R1 child mounted

        // Capture the child block before the timer auto-pops it
        const childBlock = ctx.runtime.stack.current!;

        advanceClock(ctx, 30_000); // timer fires → child auto-popped

        // The child should have been marked complete with the forced-pop reason
        expect(childBlock.isComplete).toBe(true);
        expect((childBlock as any).completionReason).toBe('forced-pop');
    });

    it('EMOM continues to next round after overrun, new child is pushed for R2', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Overrun' });
        userNext(ctx);

        advanceClock(ctx, 30_000); // R1 overrun → auto-advance → R2 child pushed

        // A new child block should now be on the stack
        const topBlock = ctx.runtime.stack.current;
        expect(topBlock).toBeDefined();
        // The EMOM block is still present below the child
        const emomBlock = ctx.runtime.stack.blocks.find(b => b.blockType === 'EMOM');
        expect(emomBlock).toBeDefined();
    });
});
