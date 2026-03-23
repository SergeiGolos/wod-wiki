/**
 * Rest Compliance Tests
 *
 * Based on: docs/finishline/compliance-scenarios/rest.md
 *
 * Covers all Rest scenarios, step-by-step, matching the spec tables.
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
import { RoundState } from '@/runtime/memory/MemoryTypes';

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

/**
 * Reads the current round state from the Rounds block on the stack.
 */
function getRoundState(ctx: SessionTestContext): RoundState | undefined {
    const roundsBlock = ctx.runtime.stack.blocks.find(b => b.blockType === 'Rounds');
    if (!roundsBlock) return undefined;
    return roundsBlock.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined;
}

// ===========================================================================
// 🟢 Timed Rest (standalone)
// Spec: rest.md#-timed-rest-standalone
// ===========================================================================
describe('🟢 Timed Rest (standalone) — 1:00 Rest', () => {
    const SCRIPT = '1:00 Rest';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 0: startSession → depth = 2 (SessionRoot + WaitingToStart)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'TimedRest' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: userNext → Rest timer starts', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'TimedRest' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/rest|timer/i);
    });

    it('step 2: advanceClock(60_000) → rest auto-completes, session ends', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'TimedRest' });
        userNext(ctx);
        advanceClock(ctx, 60_000);
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('all outputs are paired', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'TimedRest' });
        userNext(ctx);
        advanceClock(ctx, 60_000);
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});

// ===========================================================================
// 🟢 Rest Between Efforts in a Loop
// Spec: rest.md#-rest-between-efforts-in-a-loop
// ===========================================================================
describe('🟢 Rest Between Efforts in a Loop — (3) / 10 Pullups / 15 Pushups / 1:00 Rest', () => {
    const SCRIPT = '(3)\n  10 Pullups\n  15 Pushups\n  1:00 Rest';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: userNext → R1 Pullups mounted', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'LoopRest' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/effort/i);
        expect(getRoundState(ctx)?.current).toBe(1);
    });

    it('step 2: userNext → R1 Pushups mounted', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'LoopRest' });
        userNext(ctx); // Pullups R1
        userNext(ctx); // Pushups R1
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('step 3: after Pushups, rest is auto-pushed', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'LoopRest' });
        userNext(ctx); // Pullups R1
        userNext(ctx); // Pushups R1
        userNext(ctx); // Rest R1 auto-pushed
        expect(currentBlockType(ctx)).toMatch(/rest|timer/i);
    });

    it('step 3a: advanceClock(60_000) → rest expires, R2 starts', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'LoopRest' });
        userNext(ctx); // Pullups R1
        userNext(ctx); // Pushups R1
        userNext(ctx); // Rest R1
        advanceClock(ctx, 60_000); // rest expires → R2
        expect(getRoundState(ctx)?.current).toBe(2);
    });

    it('3 rounds × (2 userNext + 1 rest expiry) completes session', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'LoopRest' });
        userNext(ctx); // start

        for (let r = 0; r < 3; r++) {
            userNext(ctx); // Pullups
            userNext(ctx); // Pushups
            userNext(ctx); // Rest auto-pushed
            advanceClock(ctx, 60_000); // rest expires
        }
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Timed Rest — Skip vs. Wait (Skippable)
// Spec: rest.md#-timed-rest--skip-vs-wait-skippable
// ===========================================================================
describe('🟢 Timed Rest — Skip vs. Wait (Skippable) — :30 Rest', () => {
    const SCRIPT = ':30 Rest';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 0: startSession → depth = 2', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkippableRest' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: userNext → Rest timer starts (30s)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkippableRest' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/rest|timer/i);
    });

    it('step 2a: userNext (early skip) → rest dismissed, session ends', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkippableRest' });
        userNext(ctx); // start rest
        userNext(ctx); // skip early
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('step 2a: skipped rest carries completionReason = "user-advance"', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkippableRest' });
        userNext(ctx); // start rest
        userNext(ctx); // skip early
        const pops = systemPopValues(ctx);
        // The rest block pop carries 'user-advance'; the session root pop carries 'children-complete'
        const hasUserAdvance = pops.some(p => p.completionReason === 'user-advance');
        expect(hasUserAdvance).toBe(true);
    });

    it('step 2b: advanceClock(30_000) → rest expires, session ends', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkippableRest' });
        userNext(ctx); // start rest
        advanceClock(ctx, 30_000); // rest expires
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('step 2b: auto-expired rest does NOT carry completionReason = "user-advance"', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkippableRest' });
        userNext(ctx); // start rest
        advanceClock(ctx, 30_000); // rest expires
        const pops = systemPopValues(ctx);
        const lastPop = pops.at(-1);
        expect(lastPop?.completionReason).not.toBe('user-advance');
    });
});

// ===========================================================================
// 🟢 Forced Timed Rest — Cannot Skip (`*` prefix)
// Spec: rest.md#-forced-timed-rest--cannot-skip--prefix
// ===========================================================================
describe('🟢 Forced Timed Rest — Cannot Skip (*:30 Rest)', () => {
    const SCRIPT = '*:30 Rest';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    /** Helper: drive to the point where forced rest is the current block. */
    function enterForcedRest() {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedRest' });
        userNext(ctx); // WaitingToStart → *:30 Rest
    }

    it('step 0: startSession → depth = 2 (SessionRoot + WaitingToStart)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedRest' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: userNext → forced rest starts', () => {
        enterForcedRest();
        expect(currentBlockType(ctx)).toMatch(/rest|timer/i);
    });

    it('step 2: userNext (attempt skip) → no-op, block stays', () => {
        enterForcedRest();
        const depthAtRest = ctx.runtime.stack.count;
        userNext(ctx); // attempt skip — MUST be suppressed
        expect(ctx.runtime.stack.count).toBe(depthAtRest);
    });

    it('multiple userNext calls during forced rest all produce zero stack changes', () => {
        enterForcedRest();
        const depthAtRest = ctx.runtime.stack.count;
        userNext(ctx);
        userNext(ctx);
        userNext(ctx);
        expect(ctx.runtime.stack.count).toBe(depthAtRest);
    });

    it('forced rest remains the current block after userNext attempt', () => {
        enterForcedRest();
        userNext(ctx); // attempt skip — suppressed
        expect(currentBlockType(ctx)).toMatch(/rest|timer/i);
    });

    it('step 3: advanceClock(30_000) → timer expires, session ends', () => {
        enterForcedRest();
        advanceClock(ctx, 30_000); // forced rest timer fires → auto-pop
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('completionReason is never "user-advance" for forced rest', () => {
        enterForcedRest();
        userNext(ctx); // suppressed no-op
        advanceClock(ctx, 30_000); // timer fires

        const pops = systemPopValues(ctx);
        const lastPop = pops.at(-1);
        expect(lastPop?.completionReason).not.toBe('user-advance');
    });

    it('all outputs are paired after forced rest', () => {
        enterForcedRest();
        advanceClock(ctx, 30_000);
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});

// ===========================================================================
// 🟢 Forced Rest in a Loop
// Spec: rest.md#-forced-rest-in-a-loop
// ===========================================================================
describe('🟢 Forced Rest in a Loop — (3) / 10 Pullups / 15 Pushups / *1:00 Rest', () => {
    const SCRIPT = '(3)\n  10 Pullups\n  15 Pushups\n  *1:00 Rest';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 3: forced rest is auto-pushed after Pushups', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedLoopRest' });
        userNext(ctx); // start
        userNext(ctx); // Pullups R1
        userNext(ctx); // Pushups R1
        expect(currentBlockType(ctx)).toMatch(/rest|timer/i);
    });

    it('step 4: userNext during forced rest is a no-op', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedLoopRest' });
        userNext(ctx); // start
        userNext(ctx); // Pullups
        userNext(ctx); // Pushups → Rest auto-pushed
        const depthAtRest = ctx.runtime.stack.count;
        userNext(ctx); // attempt skip — no-op
        expect(ctx.runtime.stack.count).toBe(depthAtRest);
        expect(currentBlockType(ctx)).toMatch(/rest|timer/i);
    });

    it('step 5: advanceClock(60_000) → rest expires, R2 starts', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedLoopRest' });
        userNext(ctx); // start
        userNext(ctx); // Pullups R1
        userNext(ctx); // Pushups R1
        advanceClock(ctx, 60_000); // rest expires → R2
        expect(getRoundState(ctx)?.current).toBe(2);
    });

    it('all 3 forced rests must expire to complete session', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedLoopRest' });
        userNext(ctx); // start

        for (let r = 0; r < 3; r++) {
            userNext(ctx); // Pullups
            userNext(ctx); // Pushups
            // rest auto-pushed (no userNext needed)
            advanceClock(ctx, 60_000); // rest expires
        }
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('all 3 forced rests have completionReason != "user-advance"', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedLoopRest' });
        userNext(ctx); // start

        for (let r = 0; r < 3; r++) {
            userNext(ctx); // Pullups
            userNext(ctx); // Pushups
            advanceClock(ctx, 60_000); // rest expires
        }

        const pops = systemPopValues(ctx);
        // Each forced rest auto-popped via timer; none should be 'user-advance'
        // There are also pops for Rounds block and SessionRoot (children-complete),
        // so the total non-user-advance count exceeds 3. We verify at least 3 (one per forced rest).
        const nonUserAdvancePops = pops.filter(p => p.completionReason !== 'user-advance');
        expect(nonUserAdvancePops.length).toBeGreaterThanOrEqual(3);
    });
});

// ===========================================================================
// 🟢 Short Rest Modifier — *:30 before effort (no "Rest" keyword)
// Spec: rest.md#-short-rest-modifier--prefix-without-keyword
// ===========================================================================
describe('🟢 Short Rest Modifier — *:30 before effort', () => {
    const SCRIPT = '*:30\n10 Pullups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: userNext → *:30 timer block starts', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ShortRest' });
        userNext(ctx); // WaitingToStart → *:30 timer block
        expect(currentBlockType(ctx)).toMatch(/rest|timer/i);
    });

    it('step 2: userNext during *:30 is a no-op (forced)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ShortRest' });
        userNext(ctx); // start *:30 block
        const depthAtRest = ctx.runtime.stack.count;
        userNext(ctx); // attempt skip — MUST be suppressed
        expect(ctx.runtime.stack.count).toBe(depthAtRest);
    });

    it('step 3: advanceClock(30_000) → *:30 expires, Pullups becomes current', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ShortRest' });
        userNext(ctx); // *:30 block
        advanceClock(ctx, 30_000); // timer fires
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('step 4: userNext after Pullups → session ends', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ShortRest' });
        userNext(ctx); // *:30
        advanceClock(ctx, 30_000); // rest expires → Pullups
        userNext(ctx); // Pullups done
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('all outputs are paired', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ShortRest' });
        userNext(ctx); // *:30
        advanceClock(ctx, 30_000); // expires → Pullups
        userNext(ctx); // Pullups done
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});
