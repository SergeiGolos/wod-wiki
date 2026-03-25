/**
 * For Time Compliance Tests
 *
 * Based on: docs/finishline/compliance-scenarios/for-time.md
 *
 * Covers all For Time scenarios, step-by-step, matching the spec tables.
 *
 * Legend:
 *   🟢 Expected to pass — behaviour is fully implemented
 *   🟡 Potentially borderline — implementation may differ
 *   🔴 Expected to FAIL (RED) — behaviour is not yet implemented
 *
 * Architecture notes:
 *   - Parser metrics (Rep, Effort, Resistance) are stored in block display
 *     memory under the 'metric:display' tag.
 *   - Segment and completion OUTPUT statements only carry timing metrics
 *     (elapsed, total, spans, system-time). Display metrics live in block
 *     memory, NOT in output.
 *   - `completionReason` is carried in the `system` output event's metric
 *     value (not in the `completion` output's completionReason field).
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

/**
 * Checks if the current block's display memory contains a metric of the given type.
 */
function blockHasDisplayMetric(ctx: SessionTestContext, metricType: MetricType | string): boolean {
    const block = ctx.runtime.stack.current;
    if (!block) return false;
    return block.getMemoryByTag('metric:display')
        .flatMap(loc => loc.metrics)
        .some(m => m.type === metricType);
}

// ===========================================================================
// 🟢 Single Movement — "30 Clean & Jerk 135lb"
//
// Spec: for-time.md#-single-movement
//
// No timer involved — purely user-driven. The athlete advances manually.
// Metrics include resistance (135lb).
// ===========================================================================
describe('🟢 Single Movement (30 Clean & Jerk 135lb)', () => {
    const SCRIPT = '30 Clean & Jerk 135lb';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 0: startSession → SessionRoot + WaitingToStart (depth = 2)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Grace' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: first userNext → effort block mounted (WaitingToStart pops)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Grace' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('step 1: effort block is at depth ≥ 2 (SessionRoot + Effort)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Grace' });
        userNext(ctx);
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(2);
    });

    it('step 1: resistance metric (135lb) is stored in block display memory', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Grace' });
        userNext(ctx);
        expect(blockHasDisplayMetric(ctx, MetricType.Resistance)).toBe(true);
    });

    it('step 2: second userNext → effort pops, session ends (depth = 0)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Grace' });
        userNext(ctx); // mount effort
        userNext(ctx); // complete effort
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('no timer involved — no countdown block appears at any point', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Grace' });
        userNext(ctx);
        // No timer or countdown block should appear on the stack
        const hasTimer = ctx.runtime.stack.blocks.some(b =>
            /timer|countdown/i.test(b.blockType ?? '')
        );
        expect(hasTimer).toBe(false);
    });

    it('completionReason is user-advance for effort (via system event)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Grace' });
        userNext(ctx);
        userNext(ctx);
        expect(anySystemPopHasReason(ctx, 'user-advance')).toBe(true);
    });

    it('all outputs are paired (segment + completion for every block)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Grace' });
        userNext(ctx);
        userNext(ctx);
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});

// ===========================================================================
// 🟢 Multi-Movement with Rep Scheme — "21-15-9 For Time: Thrusters / Pull-ups"
//
// Spec: for-time.md#-multi-movement-with-rep-scheme
//
// Rep count changes per round: 21 → 15 → 9.
// Total: 3 rounds × 2 exercises = 6 userNext calls after the initial start.
// ===========================================================================
describe('🟢 Multi-Movement with Rep Scheme (21-15-9 For Time)', () => {
    // "(21-15-9)" parentheses format is the canonical parser form for rep-scheme loops.
    // The spec also documents "21-15-9 For Time" as equivalent — the parser normalises both.
    const SCRIPT = '(21-15-9)\n  Thrusters 95lb\n  Pullups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    function oneRound() {
        userNext(ctx); // Thrusters
        userNext(ctx); // Pullups
    }

    it('step 0: startSession → depth = 2 (SessionRoot + WaitingToStart)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForTime' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: first userNext → loop/rounds block and first exercise pushed', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForTime' });
        userNext(ctx); // WaitingToStart → Round 1 / Thrusters
        // Stack should be at least: SessionRoot + Loop + Effort
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(3);
    });

    it('step 1: current block is an effort type (Thrusters)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForTime' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('steps 1-2: round 1 has 2 exercises (Thrusters → Pullups)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForTime' });
        userNext(ctx); // start → Thrusters R1
        userNext(ctx); // Thrusters → Pullups R1
        expect(currentBlockType(ctx)).toMatch(/effort/i);
        // Stack still has loop block
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(2);
    });

    it('completes all 3 rounds with 6 userNexts after start', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForTime' });
        userNext(ctx); // start
        oneRound(); // R1: 21 reps each
        oneRound(); // R2: 15 reps each
        oneRound(); // R3: 9 reps each
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('session ends after exactly 3 rounds × 2 exercises = 6 userNexts', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForTime' });
        userNext(ctx); // start
        for (let i = 0; i < 6; i++) {
            expect(ctx.runtime.stack.count).toBeGreaterThan(0);
            userNext(ctx);
        }
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('all outputs are paired (segment + completion for every block)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForTime' });
        userNext(ctx);
        oneRound();
        oneRound();
        oneRound();
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });

    it('total outputs are sufficient for 3 rounds + session overhead', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForTime' });
        userNext(ctx);
        oneRound();
        oneRound();
        oneRound();
        // At minimum: SessionRoot(2) + WaitingToStart(2) + Loop(2) + 6 Efforts(12) = 18
        expect(ctx.tracer.count).toBeGreaterThanOrEqual(18);
    });
});

// ===========================================================================
// 🟢 Classic "Fran" — `21-15-9` without "For Time" keyword
//
// Spec: for-time.md#-classic-fran
//
// Same as the rep-scheme scenario above but without the explicit "For Time"
// text. The parser should compile both identically.
// ===========================================================================
describe('🟢 Classic Fran (21-15-9 without "For Time" keyword)', () => {
    const SCRIPT = '21-15-9\n  Thrusters 95lb\n  Pullups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    function oneRound() {
        userNext(ctx); // Thrusters
        userNext(ctx); // Pullups
    }

    it('startSession → depth = 2 (SessionRoot + WaitingToStart)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Fran' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('first userNext starts the rep-scheme loop and pushes first exercise', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Fran' });
        userNext(ctx);
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(3);
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('completes all 3 rounds with 6 userNexts after start (identical to For Time variant)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Fran' });
        userNext(ctx); // start
        oneRound(); // R1
        oneRound(); // R2
        oneRound(); // R3
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('all outputs are paired', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Fran' });
        userNext(ctx);
        oneRound();
        oneRound();
        oneRound();
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});

// ===========================================================================
// 🟢 For Time with Skippable Rest
//
//   21 Thrusters @ 95 lb
//   :30 Rest
//   21 Pull-ups
//
// Spec: for-time.md#-for-time-with-skippable-rest
//
// A rest period between movements can be skipped early by the athlete.
// When skipped: completionReason = 'user-advance'.
// When waited: completionReason ≠ 'user-advance' (timer-expiry or omitted).
// ===========================================================================
describe('🟢 For Time with Skippable Rest (:30 Rest)', () => {
    const SCRIPT = '21 Thrusters 95lb\n:30 Rest\n21 Pullups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 0: startSession → depth = 2', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: first userNext → Thrusters effort mounted', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // WaitingToStart → Thrusters
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('step 2: second userNext → :30 Rest/Timer block becomes current', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // Thrusters
        userNext(ctx); // :30 Rest
        expect(currentBlockType(ctx)).toMatch(/Rest|Timer/i);
    });

    it('step 3a: userNext on :30 Rest skips it — Pull-ups become current immediately', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // Thrusters
        userNext(ctx); // :30 Rest mounted
        expect(currentBlockType(ctx)).toMatch(/Rest|Timer/i);
        userNext(ctx); // skip rest → Pull-ups
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('step 3a: rest dismissed via userNext carries completionReason = "user-advance"', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // Thrusters
        userNext(ctx); // :30 Rest mounted
        userNext(ctx); // skip rest
        expect(anySystemPopHasReason(ctx, 'user-advance')).toBe(true);
    });

    it('step 3b: advanceClock(30_000) auto-expires :30 Rest → Pull-ups become current', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // Thrusters
        userNext(ctx); // :30 Rest mounted
        advanceClock(ctx, 30_000); // rest timer fires
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('step 3b: auto-expired rest does NOT carry completionReason = "user-advance"', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // Thrusters
        userNext(ctx); // :30 Rest mounted
        advanceClock(ctx, 30_000); // rest auto-expires
        // The rest block's system pop should NOT be 'user-advance'
        const pops = systemPopValues(ctx);
        const lastPop = pops.at(-1);
        expect(lastPop?.completionReason).not.toBe('user-advance');
    });

    it('session ends cleanly after skipping rest and completing Pull-ups', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // Thrusters
        userNext(ctx); // :30 Rest
        userNext(ctx); // skip rest → Pull-ups
        userNext(ctx); // Pull-ups done → session ends
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('session ends cleanly after waiting for rest to expire and completing Pull-ups', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // Thrusters
        userNext(ctx); // :30 Rest
        advanceClock(ctx, 30_000); // rest auto-expires → Pull-ups
        userNext(ctx); // Pull-ups done
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('all outputs are paired when rest is skipped', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx);
        userNext(ctx);
        userNext(ctx);
        userNext(ctx);
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});

// ===========================================================================
// 🟢 For Time with Forced Rest (Cannot Skip)
//
//   21 Thrusters @ 95 lb
//   *:30 Rest
//   21 Pull-ups
//
// Spec: for-time.md#-for-time-with-forced-rest-cannot-skip
//
// The `*` prefix marks the rest as required — userNext is IGNORED while the
// countdown is active. The block only exits when the timer fires.
// ===========================================================================
describe('🟢 For Time with Forced Rest (*:30 — Cannot Skip)', () => {
    const SCRIPT = '21 Thrusters 95lb\n*:30 Rest\n21 Pullups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    /** Helper: drive to the point where *:30 forced Rest is the current block. */
    function enterForcedRest() {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedRest' });
        userNext(ctx); // WaitingToStart → Thrusters
        userNext(ctx); // Thrusters → *:30 forced Rest
    }

    it('step 2: forced rest/timer block is mounted after Thrusters', () => {
        enterForcedRest();
        expect(currentBlockType(ctx)).toMatch(/Rest|Timer/i);
    });

    it('step 3: userNext during *:30 forced rest is a no-op — stack depth unchanged', () => {
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
        expect(ctx.runtime.stack.count).toBe(depthAtRest);
    });

    it('forced rest remains the current block after userNext attempt', () => {
        enterForcedRest();
        userNext(ctx); // attempt skip — suppressed
        expect(currentBlockType(ctx)).toMatch(/Rest|Timer/i);
    });

    it('advanceClock(30_000) expires forced rest → auto-pops → Pull-ups become current', () => {
        enterForcedRest();
        advanceClock(ctx, 30_000); // forced rest timer fires
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('forced rest completionReason is never "user-advance" (via system events)', () => {
        enterForcedRest();
        userNext(ctx); // suppressed no-op
        advanceClock(ctx, 30_000); // rest auto-pops

        const pops = systemPopValues(ctx);
        // Last pop is the forced rest auto-completing
        const lastPop = pops.at(-1);
        expect(lastPop?.completionReason).not.toBe('user-advance');
    });

    it('userNext attempts + timer expiry: no forced-rest pop has "user-advance"', () => {
        enterForcedRest();
        userNext(ctx); // suppressed
        userNext(ctx); // suppressed
        advanceClock(ctx, 30_000); // timer fires

        // The Thrusters pop IS 'user-advance' (correct for a skippable effort).
        // The forced rest pop must NOT be 'user-advance'.
        // We verify the last pop — the forced rest auto-pop — is not user-advance.
        const pops = systemPopValues(ctx);
        const lastPop = pops.at(-1);
        expect(lastPop?.completionReason).not.toBe('user-advance');
    });

    it('after forced rest expires, userNext completes Pull-ups → session ends', () => {
        enterForcedRest();
        advanceClock(ctx, 30_000); // forced rest auto-pops → Pull-ups
        userNext(ctx); // Pull-ups done
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('all outputs are paired after complete run including forced rest', () => {
        enterForcedRest();
        advanceClock(ctx, 30_000); // forced rest auto-pops
        userNext(ctx); // Pull-ups
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});
