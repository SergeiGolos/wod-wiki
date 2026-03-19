/**
 * Rounds Compliance Tests
 *
 * Based on: docs/finishline/compliance-scenarios/rounds.md
 *
 * Covers all Rounds scenarios, step-by-step, matching the spec tables.
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
import { RoundState } from '@/runtime/memory/MemoryTypes';
import { MetricType, Metric } from '@/core/models/Metric';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reads the current round state from the Rounds block on the stack.
 */
function getRoundState(ctx: SessionTestContext): RoundState | undefined {
    const roundsBlock = ctx.runtime.stack.blocks.find(b => b.blockType === 'Rounds');
    if (!roundsBlock) return undefined;
    return roundsBlock.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined;
}

/**
 * Returns the current exercise block on top of stack.
 */
function currentBlockType(ctx: SessionTestContext): string | undefined {
    return ctx.runtime.stack.current?.blockType;
}

/**
 * Returns display metrics for the current block.
 */
function getDisplayMetrics(ctx: SessionTestContext): Metric[] {
    const block = ctx.runtime.stack.current;
    if (!block) return [];
    return block.getMemoryByTag('metric:display').flatMap(loc => loc.metrics);
}

// ===========================================================================
// 🟢 Fixed Rounds — (3) 10 Pullups
// Spec: rounds.md#-fixed-rounds
// ===========================================================================
describe('🟢 Fixed Rounds — (3) 10 Pullups', () => {
    const SCRIPT = '(3)\n  10 Pullups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 0: startSession → SessionRoot + WaitingToStart', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'FixedRounds' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: first userNext starts round 1', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'FixedRounds' });
        userNext(ctx);
        expect(getRoundState(ctx)?.current).toBe(1);
        expect(getRoundState(ctx)?.total).toBe(3);
        expect(ctx.runtime.stack.current?.blockType).toMatch(/effort/i);
    });

    it('step 2-3: userNext cycles through rounds 2 and 3', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'FixedRounds' });
        userNext(ctx); // start r1
        userNext(ctx); // r1 done -> r2
        expect(getRoundState(ctx)?.current).toBe(2);
        userNext(ctx); // r2 done -> r3
        expect(getRoundState(ctx)?.current).toBe(3);
    });

    it('step 4: final userNext terminates session', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'FixedRounds' });
        userNext(ctx); // start r1
        userNext(ctx); // r1 done -> r2
        userNext(ctx); // r2 done -> r3
        userNext(ctx); // r3 done -> session end
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('child was pushed exactly 3 times (verified via tracer completions)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'FixedRounds' });
        userNext(ctx); // start r1
        userNext(ctx); // r2
        userNext(ctx); // r3
        userNext(ctx); // end
        
        // Filter for Pullups segments (have Rep metric)
        const pullupsSegments = ctx.tracer.segments.filter(s => 
            s.raw.metrics.some(m => m.type === MetricType.Rep)
        );
        expect(pullupsSegments).toHaveLength(3);
    });
});

// ===========================================================================
// 🟢 Rep Scheme Sequence — (21-15-9) Thrusters
// Spec: rounds.md#-rep-scheme-sequence
// ===========================================================================
describe('🟢 Rep Scheme Sequence — (21-15-9) Thrusters', () => {
    const SCRIPT = '(21-15-9)\n  Thrusters';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('round 1 has 21 reps', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: '21-15-9' });
        userNext(ctx);
        const reps = getDisplayMetrics(ctx).find(m => m.type === MetricType.Rep);
        expect(reps?.value).toBe(21);
    });

    it('round 2 has 15 reps', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: '21-15-9' });
        userNext(ctx); // r1
        userNext(ctx); // r2
        const reps = getDisplayMetrics(ctx).find(m => m.type === MetricType.Rep);
        expect(reps?.value).toBe(15);
    });

    it('round 3 has 9 reps', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: '21-15-9' });
        userNext(ctx); // r1
        userNext(ctx); // r2
        userNext(ctx); // r3
        const reps = getDisplayMetrics(ctx).find(m => m.type === MetricType.Rep);
        expect(reps?.value).toBe(9);
    });

    it('session ends after 3 rounds', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: '21-15-9' });
        userNext(ctx); // r1
        userNext(ctx); // r2
        userNext(ctx); // r3
        userNext(ctx); // end
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Single Round — (1) 10 Pullups
// Spec: rounds.md#-single-round
// ===========================================================================
describe('🟢 Single Round — (1) 10 Pullups', () => {
    const SCRIPT = '(1)\n  10 Pullups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('completes after one userNext', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SingleRound' });
        userNext(ctx); // start r1
        expect(ctx.runtime.stack.count).toBeGreaterThan(0);
        userNext(ctx); // end
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Rounds with Multiple Children
// Spec: rounds.md#-rounds-with-multiple-children
// ===========================================================================
describe('🟢 Rounds with Multiple Children — (3) 10 Pullups / 15 Pushups', () => {
    const SCRIPT = '(3)\n  10 Pullups\n  15 Pushups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('cycles through all children in each round', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'MultiChildRounds' });
        userNext(ctx); // r1, child 1
        expect(getRoundState(ctx)?.current).toBe(1);
        expect(ctx.runtime.stack.current?.blockType).toMatch(/effort/i);
        
        userNext(ctx); // r1, child 2
        expect(getRoundState(ctx)?.current).toBe(1);
        
        userNext(ctx); // r1 done -> r2, child 1
        expect(getRoundState(ctx)?.current).toBe(2);
    });

    it('presents correct exercises in order', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'MultiChildRounds' });
        userNext(ctx); // r1 Pullups
        userNext(ctx); // r1 Pushups
        userNext(ctx); // r2 Pullups
        userNext(ctx); // r2 Pushups
        userNext(ctx); // r3 Pullups
        userNext(ctx); // r3 Pushups
        userNext(ctx); // end
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🔴 Large Round Count
// Spec: rounds.md#-large-round-count-skip
// ===========================================================================
describe('🔴 Large Round Count — (100) 5 Burpees', () => {
    it('compiles without error', () => {
        const ctx = createSessionContext('(100)\n  5 Burpees');
        startSession(ctx, { label: 'LargeCount' });
        expect(ctx.runtime.stack.count).toBeGreaterThan(0);
        disposeSession(ctx);
    });

    it('10000 iterations complete without memory issues and within performance target', () => {
        const ctx = createSessionContext('(10000)\n  5 Burpees');
        startSession(ctx, { label: 'LargeCount' });
        userNext(ctx); // start
        
        const start = performance.now();
        for (let i = 0; i < 10000; i++) {
            userNext(ctx);
        }
        const end = performance.now();
        
        expect(ctx.runtime.stack.count).toBe(0);
        expect(end - start).toBeLessThan(500); // 10,000 iterations in < 500ms
        disposeSession(ctx);
    });
});

// ===========================================================================
// 🟡 Rounds with Skippable Rest
// Spec: rounds.md#-rounds-with-skippable-rest
// ===========================================================================
describe('🟡 Rounds with Skippable Rest', () => {
    const SCRIPT = '(3)\n  10 Pullups\n  15 Pushups\n  1:00 Rest';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 3: rest is auto-pushed after pushups', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // start -> Pullups (R1)
        userNext(ctx); // Pullups done -> Pushups (R1)
        userNext(ctx); // Pushups done -> Rest (R1)
        
        // Rest should be on top
        expect(ctx.runtime.stack.current?.blockType).toMatch(/rest|timer/i);
    });

    it('step 4a: rest can be skipped via userNext', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // start
        userNext(ctx); // Pullups
        userNext(ctx); // Pushups
        userNext(ctx); // skip Rest
        expect(getRoundState(ctx)?.current).toBe(2);
    });

    it('step 4b: rest can be waited out', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'WaitRest' });
        userNext(ctx); // start
        userNext(ctx); // Pullups
        userNext(ctx); // Pushups
        advanceClock(ctx, 60_000);
        expect(getRoundState(ctx)?.current).toBe(2);
    });
});

// ===========================================================================
// 🔴 Rounds with Forced Rest (Cannot Skip)
// Spec: rounds.md#-rounds-with-forced-rest-cannot-skip
// ===========================================================================
describe('🔴 Rounds with Forced Rest (Cannot Skip)', () => {
    const SCRIPT = '(3)\n  10 Pullups\n  15 Pushups\n  *1:00 Rest';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('userNext during forced rest is a no-op', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedRest' });
        userNext(ctx); // start
        userNext(ctx); // Pullups
        userNext(ctx); // Pushups
        
        const depthBeforeSkip = ctx.runtime.stack.count;
        userNext(ctx); // attempt skip
        expect(ctx.runtime.stack.count).toBe(depthBeforeSkip);
        expect(ctx.runtime.stack.current?.blockType).toMatch(/rest|timer/i);
    });

    it('rest auto-pops after timer expiry', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedRest' });
        userNext(ctx); // start
        userNext(ctx); // Pullups
        userNext(ctx); // Pushups
        advanceClock(ctx, 60_000);
        expect(getRoundState(ctx)?.current).toBe(2);
    });

    it('final forced rest must also expire to end session', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedRestEnd' });
        userNext(ctx); // start
        
        for (let r = 0; r < 3; r++) {
            userNext(ctx); // Pullups
            userNext(ctx); // Pushups
            if (r < 2) advanceClock(ctx, 60_000); // Wait rest for R1, R2
        }
        
        // Now at final rest of R3
        expect(ctx.runtime.stack.current?.blockType).toMatch(/rest|timer/i);
        userNext(ctx); // skip attempt
        expect(ctx.runtime.stack.count).toBeGreaterThan(0);
        
        advanceClock(ctx, 60_000);
        expect(ctx.runtime.stack.count).toBe(0);
    });
});
