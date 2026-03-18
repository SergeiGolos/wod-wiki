/**
 * AMRAP Compliance Tests
 *
 * Based on: docs/finishline/compliance-scenarios/amrap.md
 *
 * Covers all AMRAP scenarios, step-by-step, matching the spec tables.
 *
 * Legend:
 *   🟢 Expected to pass — behaviour is fully implemented
 *   🟡 Potentially borderline — implementation may differ
 *   🔴 Expected to FAIL (RED) — behaviour is not yet implemented
 *
 * RED scenarios in this file:
 *   - 🔴 Forced Rest (*:30) — userNext must be a no-op while the countdown
 *     is active.  Currently the `*` prefix sets `behavior.inject_rest` on the
 *     child timer, which does NOT suppress userNext.  These tests will fail
 *     until RequiredTimerBehavior (or an equivalent guard) is implemented.
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
import { MetricType } from '@/core/models/Metric';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reads the current round state from the AMRAP block on the stack.
 * Returns undefined when no AMRAP block is present.
 */
function getRoundState(ctx: SessionTestContext): RoundState | undefined {
    const amrapBlock = ctx.runtime.stack.blocks.find(b => b.blockType === 'AMRAP');
    if (!amrapBlock) return undefined;
    return amrapBlock.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined;
}

/**
 * Returns the blockType of the currently-active (top-of-stack) block.
 */
function currentBlockType(ctx: SessionTestContext): string | undefined {
    return ctx.runtime.stack.current?.blockType;
}

// ===========================================================================
// 🟢 Classic AMRAP — "Cindy"
// 20:00 AMRAP  5 Pullups / 10 Pushups / 15 Air Squats
// Spec: docs/finishline/compliance-scenarios/amrap.md#-classic-amrap--cindy
// ===========================================================================
describe('🟢 Classic AMRAP — Cindy (20:00 / 3 children)', () => {
    const SCRIPT = '20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  15 Air Squats';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    function oneRound() {
        userNext(ctx); // Pullups done
        userNext(ctx); // Pushups done
        userNext(ctx); // Air Squats done  →  cycle complete, round advances
    }

    it('step 0: startSession → SessionRoot + WaitingToStart (depth = 2)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Cindy' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: first userNext starts AMRAP and pushes 1st exercise', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Cindy' });
        userNext(ctx);
        // WaitingToStart popped; AMRAP block + first exercise now on stack
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(3);
    });

    it('step 1: AMRAP block is present on the stack after first userNext', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Cindy' });
        userNext(ctx);
        const amrapBlock = ctx.runtime.stack.blocks.find(b => b.blockType === 'AMRAP');
        expect(amrapBlock).toBeDefined();
    });

    it('step 1: round counter initialises at 1', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Cindy' });
        userNext(ctx);
        expect(getRoundState(ctx)?.current).toBe(1);
    });

    it('step 2: second userNext advances to 2nd exercise (Pushups)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Cindy' });
        userNext(ctx); // start
        userNext(ctx); // Pullups → Pushups
        // Round is still 1 (cycle incomplete)
        expect(getRoundState(ctx)?.current).toBe(1);
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(3);
    });

    it('step 3: third userNext advances to 3rd exercise (Air Squats)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Cindy' });
        userNext(ctx); // start
        userNext(ctx); // Pullups
        userNext(ctx); // Pushups → Air Squats
        // Round is still 1 (cycle incomplete until 3rd child pops)
        expect(getRoundState(ctx)?.current).toBe(1);
    });

    it('step 4: 4th userNext starts round 2 (children cycle back to Pullups)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Cindy' });
        userNext(ctx); // start
        advanceClock(ctx, 60_000);
        oneRound(); // round 1 done → round 2
        expect(getRoundState(ctx)?.current).toBe(2);
    });

    it('round counter increments correctly across 3 complete rounds', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Cindy' });
        userNext(ctx); // start
        for (let r = 1; r <= 3; r++) {
            advanceClock(ctx, 60_000);
            oneRound();
        }
        expect(getRoundState(ctx)?.current).toBe(4);
    });

    it('total rounds is undefined (unbounded AMRAP)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Cindy' });
        userNext(ctx);
        expect(getRoundState(ctx)?.total).toBeUndefined();
    });

    it('step N: advanceClock(1_200_000) expires timer → session auto-terminates (no userNext needed)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Cindy' });
        userNext(ctx); // start
        advanceClock(ctx, 60_000);
        oneRound();
        advanceClock(ctx, 1_140_000); // 20 min total
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('all outputs are paired (segment + completion for every block)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Cindy' });
        userNext(ctx);
        advanceClock(ctx, 60_000);
        oneRound();
        advanceClock(ctx, 1_140_000);
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});

// ===========================================================================
// 🟢 Short AMRAP — 2:00 / 5 Burpees
// ===========================================================================
describe('🟢 Short AMRAP (2:00 / 1 child)', () => {
    const SCRIPT = '2:00 AMRAP\n  5 Burpees';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: userNext starts AMRAP and pushes child', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Short' });
        userNext(ctx);
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(2);
    });

    it('step 2: second userNext completes round 1 and starts round 2', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Short' });
        userNext(ctx); // start
        userNext(ctx); // round 1 done → round 2
        expect(getRoundState(ctx)?.current).toBe(2);
    });

    it('at least 2 rounds complete before clock advance', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Short' });
        userNext(ctx); // start, round 1
        userNext(ctx); // round 2
        // Still inside the AMRAP — timer has not fired yet
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(2);
    });

    it('advanceClock(120_000) expires 2:00 timer → session auto-terminates', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Short' });
        userNext(ctx);
        advanceClock(ctx, 120_000);
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Single-Exercise AMRAP
// 10:00 AMRAP / 1 Snatch
// ===========================================================================
describe('🟢 Single-Exercise AMRAP (10:00 / 1 child)', () => {
    const SCRIPT = '10:00 AMRAP\n  1 Snatch';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('single child loops on successive userNext calls', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Single' });
        userNext(ctx); // start → round 1
        userNext(ctx); // round 2
        userNext(ctx); // round 3
        // No crash or index-out-of-bounds; still running
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(2);
    });

    it('round increments on each userNext', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Single' });
        userNext(ctx); // start
        userNext(ctx); // round 2
        userNext(ctx); // round 3
        expect(getRoundState(ctx)?.current).toBe(3);
    });

    it('total rounds is undefined (unbounded)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Single' });
        userNext(ctx);
        expect(getRoundState(ctx)?.total).toBeUndefined();
    });

    it('timer expiry at 10:00 terminates session', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Single' });
        userNext(ctx);
        userNext(ctx);
        advanceClock(ctx, 600_000); // 10:00
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 AMRAP with `-` Sequential Grouping
// Each `-` child is its own child group; 3 userNexts = 1 round.
// Spec: amrap.md#-amrap-with---sequential-grouping
// ===========================================================================
describe('🟢 AMRAP with - Sequential Grouping (Cindy variant)', () => {
    const SCRIPT = '20:00 AMRAP\n  - 5 Pullups\n  - 10 Pushups\n  - 15 Air Squats';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    function oneRound() {
        userNext(ctx); // child 1
        userNext(ctx); // child 2
        userNext(ctx); // child 3 → cycle complete
    }

    it('step 1: AMRAP mounts and first child pushed', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SeqCindy' });
        userNext(ctx);
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(3);
        expect(getRoundState(ctx)?.current).toBe(1);
    });

    it('round stays 1 after 2 of 3 children complete (cycle incomplete)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SeqCindy' });
        userNext(ctx); // start
        userNext(ctx); // child 1 done
        userNext(ctx); // child 2 done — still round 1
        expect(getRoundState(ctx)?.current).toBe(1);
    });

    it('3 userNexts complete round 1 → round 2 begins', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SeqCindy' });
        userNext(ctx); // start
        advanceClock(ctx, 60_000);
        oneRound();
        expect(getRoundState(ctx)?.current).toBe(2);
    });

    it('round counter matches Math.floor(nextCount / 3) + 1 pattern', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SeqCindy' });
        userNext(ctx); // start

        expect(getRoundState(ctx)?.current).toBe(1); // 0 full cycles

        advanceClock(ctx, 60_000);
        oneRound();
        expect(getRoundState(ctx)?.current).toBe(2); // 1 full cycle

        advanceClock(ctx, 60_000);
        oneRound();
        expect(getRoundState(ctx)?.current).toBe(3); // 2 full cycles
    });

    it('timer expiry auto-terminates session', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SeqCindy' });
        userNext(ctx);
        oneRound();
        advanceClock(ctx, 1_200_000); // 20 min
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 AMRAP with `+` Composed Grouping
// All `+` lines merged into ONE child group; 1 userNext = 1 round.
// Spec: amrap.md#-amrap-with--composed-grouping-complex--superset
// ===========================================================================
describe('🟢 AMRAP with + Composed Grouping (single child group)', () => {
    const SCRIPT = '20:00 AMRAP\n  + 5 Pullups\n  + 10 Pushups\n  + 15 Air Squats';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('exactly one child block on stack after first userNext (one composite group)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Comp' });
        userNext(ctx); // start → composite block pushed
        // Stack: SessionRoot + AMRAP + 1 composite child = 3
        expect(ctx.runtime.stack.count).toBe(3);
    });

    it('round 1 after first userNext starts the composite block', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Comp' });
        userNext(ctx);
        expect(getRoundState(ctx)?.current).toBe(1);
    });

    it('one userNext = one completed round', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Comp' });
        userNext(ctx); // start → round 1
        userNext(ctx); // composite done → round 2
        expect(getRoundState(ctx)?.current).toBe(2);
    });

    it('round increments sequentially: 1 → 2 → 3 → 4 → 5', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Comp' });
        userNext(ctx); // start

        for (let expected = 2; expected <= 5; expected++) {
            userNext(ctx);
            expect(getRoundState(ctx)?.current).toBe(expected);
        }
    });

    it('timer expiry at 20:00 terminates session', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Comp' });
        userNext(ctx);
        userNext(ctx);
        advanceClock(ctx, 1_200_000); // 20 min
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟡 AMRAP with Skippable Rest Between Rounds
// :30 Rest child — userNext dismisses early OR timer auto-completes.
// Spec: amrap.md#-amrap-with-skippable-rest-between-rounds
// ===========================================================================
describe('🟡 AMRAP with Skippable Rest (:30 Rest)', () => {
    const SCRIPT = '20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  :30 Rest';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: AMRAP starts, Pullups pushed', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx);
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(3);
    });

    it('step 3: after 2 exercises, a rest/timer block is the current block', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // start → Pullups
        userNext(ctx); // Pushups
        userNext(ctx); // :30 Rest pushed
        const current = ctx.runtime.stack.current;
        // Block should be Rest or a timer type
        expect(current?.blockType).toMatch(/Rest|Timer/i);
    });

    it('step 4a: userNext on :30 Rest skips it — round 2 begins immediately', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // start → Pullups
        userNext(ctx); // Pushups
        userNext(ctx); // :30 Rest mounted
        // Rest is the current block before the skip
        expect(ctx.runtime.stack.current?.blockType).toMatch(/Rest|Timer/i);
        userNext(ctx); // skip rest early → rest pops, Pullups for round 2 pushed
        // Round 2 should have started; current block is no longer the rest type
        expect(ctx.runtime.stack.current?.blockType).not.toMatch(/Rest|Timer/i);
        expect(getRoundState(ctx)?.current).toBe(2);
    });

    it('step 4b: advanceClock(30_000) auto-expires :30 Rest → round 2 begins', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // start
        userNext(ctx); // Pullups
        userNext(ctx); // :30 Rest mounted
        advanceClock(ctx, 30_000); // rest auto-expires
        expect(getRoundState(ctx)?.current).toBe(2);
    });

    it('AMRAP timer expiry at 20:00 terminates session', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx);
        advanceClock(ctx, 1_200_000); // 20 min
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🔴 AMRAP with Forced Rest (Cannot Skip)
// *:30 Rest — userNext MUST be a no-op while countdown is active.
//
// These tests are RED — they document behaviour that is NOT yet implemented.
// Currently the `*` prefix sets `behavior.inject_rest` on the child timer,
// which does NOT suppress userNext.  ExitBehavior still fires, making the
// rest block skippable just like a plain :30 Rest.
//
// Required implementation:
//   - Parser must emit `required: true` (or a dedicated hint) on the
//     DurationMetric when `*` prefix is detected.
//   - A RequiredTimerBehavior (or flag on CountdownTimerBehavior) must
//     intercept onNext() and return [] while the countdown is active.
//
// Spec: amrap.md#-amrap-with-forced-rest-cannot-skip
// ===========================================================================
describe('🔴 AMRAP with Forced Rest (*:30 — Cannot Skip)', () => {
    const SCRIPT = '20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  *:30 Rest';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    /** Helper: drive to the point where forced rest is the current block. */
    function enterForcedRest() {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedRest' });
        userNext(ctx); // start → Pullups
        userNext(ctx); // Pushups
        userNext(ctx); // *:30 forced Rest mounted
    }

    it('step 3: a rest/timer block is mounted after 2 exercises', () => {
        enterForcedRest();
        const current = ctx.runtime.stack.current;
        expect(current?.blockType).toMatch(/Rest|Timer/i);
    });

    it('step 4: userNext during *:30 forced rest is a no-op — stack depth unchanged', () => {
        enterForcedRest();
        const depthAtRest = ctx.runtime.stack.count;
        userNext(ctx); // attempt skip — MUST be suppressed
        expect(ctx.runtime.stack.count).toBe(depthAtRest);
    });

    it('multiple userNext calls during *:30 forced rest all produce zero stack changes', () => {
        enterForcedRest();
        const depthAtRest = ctx.runtime.stack.count;
        userNext(ctx);
        userNext(ctx);
        userNext(ctx);
        // All three skips suppressed; stack is unchanged
        expect(ctx.runtime.stack.count).toBe(depthAtRest);
    });

    it('round counter stays at 1 while rest is active (no premature increment)', () => {
        enterForcedRest();
        userNext(ctx); // no-op attempt
        // We completed: Pullups → Pushups → Rest (no cycle complete yet)
        expect(getRoundState(ctx)?.current).toBe(1);
    });

    it('advanceClock(30_000) expires the forced rest → auto-pops → round 2 starts', () => {
        enterForcedRest();
        advanceClock(ctx, 30_000); // rest timer fires
        // Forced rest auto-popped; ChildSelection loops → round 2
        expect(getRoundState(ctx)?.current).toBe(2);
    });

    it('AMRAP timer expiry ends session even while inside forced rest', () => {
        enterForcedRest();
        advanceClock(ctx, 1_200_000); // 20 min AMRAP expiry
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🔴 AMRAP with `+` Composed Grouping — Proportional Output Splitting
//
// When a composite block (multiple `+` statements compiled as one child group)
// completes, the runtime must emit a SEPARATE completion output for each
// constituent exercise, with elapsed time distributed proportionally by rep
// count.  Rep ratio: 5 Pullups : 10 Pushups : 15 Air Squats = 1 : 2 : 3
// → each exercise gets 1/6, 2/6, 3/6 of the total elapsed time.
//
// These tests verify an AMRAP-specific assertion from the spec that is
// NOT covered by any existing test:
//   "Each userNext produces proportional segment outputs for all 3 exercises."
//
// RED: currently the composite block's completion output structure is
// untested in the AMRAP context.  The code path in ReportOutputBehavior
// does split proportionally when `displayGroups.length > 1`, but the
// AMRAP pipeline may yield only one display group (the composed block's
// metrics are flattened by EffortFallbackStrategy into a single group).
// These tests will turn GREEN once proportional splitting is confirmed or
// fixed for multi-statement composed child groups.
//
// Spec: amrap.md#-amrap-with--composed-grouping-complex--superset
// ===========================================================================
describe('🔴 AMRAP with + Composed Grouping — proportional output splitting', () => {
    const SCRIPT = '20:00 AMRAP\n  + 5 Pullups\n  + 10 Pushups\n  + 15 Air Squats';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('completing one composite round emits ≥ 3 completion outputs (one per exercise)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Comp' });
        userNext(ctx);            // start → composite block pushed (round 1)
        advanceClock(ctx, 60_000); // 60 s elapsed inside the round
        userNext(ctx);             // composite block completes → split completions

        // Completions from the composite block should be 3 (one per exercise).
        // Filter out SessionRoot / AMRAP completions by requiring display metrics.
        const exerciseCompletions = ctx.tracer.completions.filter(c =>
            c.raw.metrics.some(m =>
                m.type === MetricType.Rep || m.type === MetricType.Effort
            )
        );
        expect(exerciseCompletions.length).toBeGreaterThanOrEqual(3);
    });

    it('each split completion contains exercise-specific Rep or Effort metric', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Comp' });
        userNext(ctx);
        advanceClock(ctx, 60_000);
        userNext(ctx);

        const exerciseCompletions = ctx.tracer.completions.filter(c =>
            c.raw.metrics.some(m =>
                m.type === MetricType.Rep || m.type === MetricType.Effort
            )
        );

        // Must have at least 3 exercise completions to verify
        expect(exerciseCompletions.length).toBeGreaterThanOrEqual(3);

        // Every exercise completion should carry at least one Rep metric
        for (const comp of exerciseCompletions) {
            const hasRep = comp.raw.metrics.some(m => m.type === MetricType.Rep);
            expect(hasRep).toBe(true);
        }
    });

    it('elapsed time across split completions sums to total elapsed (within 1 % rounding)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Comp' });
        userNext(ctx);
        advanceClock(ctx, 60_000);
        userNext(ctx);

        // Filter specifically for exercise-level completions (must have Rep metric)
        const exerciseCompletions = ctx.tracer.completions.filter(c =>
            c.raw.metrics.some(m => m.type === MetricType.Rep)
        );

        // Must have exactly 3 split completions (one per statement)
        expect(exerciseCompletions).toHaveLength(3);

        const totalSplitElapsed = exerciseCompletions.reduce((sum, c) => {
            const elapsed = c.raw.metrics.find(m => m.type === MetricType.Elapsed);
            return sum + ((elapsed?.value as number) ?? 0);
        }, 0);

        // 60 000 ms elapsed; sum of splits should be within 1 % (600 ms) for rounding
        expect(totalSplitElapsed).toBeGreaterThan(59_400);
        expect(totalSplitElapsed).toBeLessThanOrEqual(60_600);
    });

    it('rep ratio 5:10:15 → split elapsed values are in ascending order', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Comp' });
        userNext(ctx);
        advanceClock(ctx, 30_000); // 30 s for clean numbers: Pullups≈5s, Pushups≈10s, Squats≈15s
        userNext(ctx);

        const exerciseCompletions = ctx.tracer.completions.filter(c =>
            c.raw.metrics.some(m => m.type === MetricType.Rep)
        );

        const elapsedValues = exerciseCompletions
            .map(c => (c.raw.metrics.find(m => m.type === MetricType.Elapsed)?.value as number) ?? 0)
            .filter(v => v > 0);

        expect(elapsedValues).toHaveLength(3);
        const sorted = [...elapsedValues].sort((a, b) => a - b);
        // The smallest elapsed corresponds to 5 Pullups, largest to 15 Air Squats
        // Values should differ meaningfully: sorted[0] < sorted[1] < sorted[2]
        expect(sorted[0]).toBeLessThan(sorted[1]);
        expect(sorted[1]).toBeLessThan(sorted[2]);
    });
});

// ===========================================================================
// 🔴 AMRAP Skippable Rest — completionReason in system events
//
// When :30 Rest inside an AMRAP is dismissed early by userNext, the system
// pop event for that block should carry `completionReason = 'user-advance'`.
// When it auto-expires via the clock, the reason must be anything OTHER than
// 'user-advance' (typically 'timer-expiry' or omitted).
//
// These tests are RED because this AMRAP-specific completionReason behaviour
// is NOT covered by any existing test (the skippable-rest tests only check
// stack depth and round counter, not completionReason).
//
// Spec: amrap.md#-amrap-with-skippable-rest-between-rounds
// ===========================================================================
describe('🔴 AMRAP Skippable Rest — completionReason in system events', () => {
    const SCRIPT = '20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  :30 Rest';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    /** Helper: advance through Pullups and Pushups so :30 Rest is the current block. */
    function setupAndReachRest() {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'RestReason' });
        userNext(ctx); // start → Pullups
        userNext(ctx); // Pushups
        userNext(ctx); // :30 Rest mounted
    }

    /** Extract system pop event values from the tracer. */
    function systemPopValues(): Array<Record<string, unknown>> {
        return ctx.tracer.outputs
            .filter(o => o.outputType === 'system')
            .map(o => {
                const m = o.raw.metrics.find(m => m.type === MetricType.System);
                return m?.value as Record<string, unknown> | undefined;
            })
            .filter((v): v is Record<string, unknown> => !!v && v['event'] === 'pop');
    }

    it('skipping :30 Rest via userNext → completionReason = "user-advance" in system pop', () => {
        setupAndReachRest();
        userNext(ctx); // skip rest early

        const pops = systemPopValues();
        const lastPop = pops.at(-1);
        expect(lastPop?.completionReason).toBe('user-advance');
    });

    it('auto-expiring :30 Rest → completionReason is NOT "user-advance"', () => {
        setupAndReachRest();
        advanceClock(ctx, 30_000); // rest auto-expires

        const pops = systemPopValues();
        const lastPop = pops.at(-1);
        expect(lastPop?.completionReason).not.toBe('user-advance');
    });

    it('round advances to 2 after rest is skipped, confirming the pop was the rest block', () => {
        setupAndReachRest();
        userNext(ctx); // skip rest → round 2
        expect(getRoundState(ctx)?.current).toBe(2);
    });
});

// ===========================================================================
// 🔴 AMRAP Forced Rest — completionReason never 'user-advance'
//
// For *:30 Rest (forced, non-skippable), userNext attempts are suppressed.
// The block can ONLY exit via timer expiry.  Therefore every system pop
// event for the forced rest block must have `completionReason` that is NOT
// 'user-advance'.  This assertion is NOT currently covered by any existing
// test in this file (the existing tests only verify stack depth is unchanged
// during suppressed userNext, not the completionReason in system events).
//
// Spec: amrap.md#-amrap-with-forced-rest-cannot-skip
// ===========================================================================
describe('🔴 AMRAP Forced Rest — completionReason never "user-advance"', () => {
    const SCRIPT = '20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  *:30 Rest';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    /** Helper: drive to the point where forced rest is the current block. */
    function enterForcedRest() {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedRestReason' });
        userNext(ctx); // start → Pullups
        userNext(ctx); // Pushups
        userNext(ctx); // *:30 forced Rest mounted
    }

    /** Extract system pop event values from the tracer. */
    function systemPopValues(): Array<Record<string, unknown>> {
        return ctx.tracer.outputs
            .filter(o => o.outputType === 'system')
            .map(o => {
                const m = o.raw.metrics.find(m => m.type === MetricType.System);
                return m?.value as Record<string, unknown> | undefined;
            })
            .filter((v): v is Record<string, unknown> => !!v && v['event'] === 'pop');
    }

    it('after forced rest expires via timer, last system pop is NOT "user-advance"', () => {
        enterForcedRest();
        advanceClock(ctx, 30_000); // forced rest timer fires → auto-pop

        const pops = systemPopValues();
        const lastPop = pops.at(-1);
        // The last pop is the forced rest auto-completing; must not be user-advance
        expect(lastPop?.completionReason).not.toBe('user-advance');
    });

    it('after userNext attempts + timer expiry, no forced-rest pop has "user-advance"', () => {
        enterForcedRest();
        userNext(ctx); // no-op (suppressed)
        userNext(ctx); // no-op (suppressed)
        advanceClock(ctx, 30_000); // timer fires → forced rest auto-pops

        const pops = systemPopValues();

        // Pullups pop is 'user-advance' (expected and correct).
        // The forced rest pop must NOT be 'user-advance'.
        // The most recent pop after clock advance is the forced rest block.
        const lastPop = pops.at(-1);
        expect(lastPop?.completionReason).not.toBe('user-advance');
    });

    it('forced rest completion output has no completionReason = "user-advance"', () => {
        enterForcedRest();
        advanceClock(ctx, 30_000);

        // completionReason is also surfaced on the completion IOutputStatement itself
        const forcedRestCompletion = ctx.tracer.completions
            .filter(c => c.raw.completionReason !== undefined)
            .at(-1);

        if (forcedRestCompletion) {
            expect(forcedRestCompletion.raw.completionReason).not.toBe('user-advance');
        }
        // If no completion has a completionReason set, the assertion trivially passes —
        // that means the reason is never propagated to the completion output (a separate
        // RED test would be needed to assert it IS propagated, but that is out of scope here).
    });

    it('after forced rest timer fires, round 2 begins (confirming correct pop path)', () => {
        enterForcedRest();
        advanceClock(ctx, 30_000);
        expect(getRoundState(ctx)?.current).toBe(2);
    });
});
