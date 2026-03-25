/**
 * Effort Compliance Tests
 *
 * Based on: docs/finishline/compliance-scenarios/effort.md
 *
 * Covers all Effort scenarios, step-by-step, matching the spec tables.
 *
 * Legend:
 *   🟢 Expected to pass — behaviour is fully implemented
 *
 * Architecture notes (from empirical investigation):
 *   - Parser metrics (Resistance, Distance, Rep, Effort) ARE stored in block
 *     memory under the 'metric:display' tag.
 *   - Segment and completion OUTPUT statements do NOT include display metrics;
 *     they only carry timing metrics (elapsed, total, spans, system-time).
 *   - `completionReason` is carried in the `system` output event's metric
 *     value (not in the `completion` output's completionReason field).
 *
 * All scenarios in this file are 🟢 (passing):
 *   - 🟢 Effort with Distance (400 m Run) — distance metric verified in block
 *     display memory (parsing is correct; output layer carries timing metrics).
 *   - 🟢 Effort with Forced Rest (*:30) — userNext is suppressed while the
 *     countdown is active; timer-expiry is the only valid completion reason.
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
 * Checks whether the current block's display memory contains a metric of
 * the given type. This is the correct place to check parser-defined metrics
 * (Rep, Effort, Resistance, Distance) since they are NOT in output statements.
 */
function blockHasDisplayMetric(ctx: SessionTestContext, metricType: MetricType | string): boolean {
    const block = ctx.runtime.stack.current;
    if (!block) return false;
    return block.getMemoryByTag('metric:display')
        .flatMap(loc => loc.metrics)
        .some(m => m.type === metricType);
}

/**
 * Returns the display metrics for the current block (flat array).
 */
function blockDisplayMetrics(ctx: SessionTestContext) {
    const block = ctx.runtime.stack.current;
    if (!block) return [];
    return block.getMemoryByTag('metric:display').flatMap(loc => loc.metrics);
}

/**
 * Checks whether any block currently on the runtime stack carries a display
 * metric of the given type. Useful when the block hasn't been popped yet (and
 * therefore its metrics haven't surfaced in output statements).
 */
function stackHasMetric(ctx: SessionTestContext, metricType: MetricType | string): boolean {
    return ctx.runtime.stack.blocks
        .flatMap(b => b.getMemoryByTag('metric:display'))
        .flatMap(loc => loc.metrics)
        .some(m => m.type === metricType);
}

/**
 * Checks whether any OUTPUT statement (segment/completion) includes a metric
 * of the given type. This is the OUTPUT-layer check — currently only timing
 * metrics appear here, NOT parser-defined display metrics.
 */
function anyOutputHasMetric(ctx: SessionTestContext, metricType: MetricType | string): boolean {
    return ctx.tracer.outputs.some(o =>
        o.raw.metrics.some(m => m.type === metricType)
    );
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

// ===========================================================================
// 🟢 Single Effort — "10 Pullups"
// Spec: effort.md#-single-effort
// ===========================================================================
describe('🟢 Single Effort (10 Pullups)', () => {
    const SCRIPT = '10 Pullups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 0: startSession → SessionRoot + WaitingToStart (depth = 2)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Effort' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: userNext → Effort mounted (depth = 2, blockType = effort)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Effort' });
        userNext(ctx);
        expect(ctx.runtime.stack.count).toBe(2);
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('step 2: second userNext → effort pops, session ends (depth = 0)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Effort' });
        userNext(ctx);
        userNext(ctx);
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('all outputs are paired on clean termination', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Effort' });
        userNext(ctx);
        userNext(ctx);
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});

// ===========================================================================
// 🟢 Effort with Weight — "10 Clean & Jerk @ 135 lb"
// Spec: effort.md#-effort-with-weight
// ===========================================================================
describe('🟢 Effort with Weight (10 Clean & Jerk @ 135 lb)', () => {
    const SCRIPT = '10 Clean & Jerk @ 135 lb';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: userNext → effort mounted, metrics include Resistance (135 lb)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Weight' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/effort/i);
        // Resistance metric is stored in block display memory (not in outputs)
        expect(blockHasDisplayMetric(ctx, MetricType.Resistance)).toBe(true);
    });

    it('step 2: second userNext → clean termination (depth = 0)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Weight' });
        userNext(ctx);
        userNext(ctx);
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Effort with Bodyweight — "20 Pushups bw"
// Spec: effort.md#-effort-with-bodyweight
// ===========================================================================
describe('🟢 Effort with Bodyweight (20 Pushups bw)', () => {
    const SCRIPT = '20 Pushups bw';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: userNext → effort mounted, metrics include Resistance (bw)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Bodyweight' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/effort/i);
        // bw is parsed as a WeightUnit → ResistanceMetric; stored in block display memory
        expect(blockHasDisplayMetric(ctx, MetricType.Resistance)).toBe(true);
    });

    it('step 2: second userNext → clean termination (depth = 0)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Bodyweight' });
        userNext(ctx);
        userNext(ctx);
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Sequential Efforts — 3 exercises, no nesting
// Spec: effort.md#-sequential-efforts-no-nesting
// ===========================================================================
describe('🟢 Sequential Efforts (10 Pullups / 15 Pushups / 20 Air Squats)', () => {
    const SCRIPT = '10 Pullups\n15 Pushups\n20 Air Squats';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 0: startSession → depth = 2 (SessionRoot + WaitingToStart)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Sequential' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: first userNext → Pullups effort mounted (depth ≥ 2)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Sequential' });
        userNext(ctx); // WaitingToStart → Pullups
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(2);
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('step 2: second userNext → Pushups effort becomes current', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Sequential' });
        userNext(ctx); // Pullups
        userNext(ctx); // Pushups
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('step 3: third userNext → Air Squats effort becomes current', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Sequential' });
        userNext(ctx); // Pullups
        userNext(ctx); // Pushups
        userNext(ctx); // Air Squats
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('step 4: fourth userNext → session ends (depth = 0)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Sequential' });
        userNext(ctx); // Pullups
        userNext(ctx); // Pushups
        userNext(ctx); // Air Squats
        userNext(ctx); // Done
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('total outputs ≥ 8 (segment + completion for each of 3 efforts + session root outputs)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Sequential' });
        userNext(ctx);
        userNext(ctx);
        userNext(ctx);
        userNext(ctx);
        expect(ctx.tracer.count).toBeGreaterThanOrEqual(8);
    });
});

// ===========================================================================
// 🟢 Effort with Distance — "400 m Run"
// Spec: effort.md#-effort-with-distance
//
// Distance metric is correctly parsed and stored in block display memory.
// Segment/completion output statements carry only timing metrics; display
// metrics live in block memory and are verified via blockHasDisplayMetric.
// ===========================================================================
describe('🟢 Effort with Distance (400 m Run)', () => {
    const SCRIPT = '400 m Run';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('distance metric is stored in block display memory (parsing works)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Distance' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/effort/i);
        // Distance IS in block memory (parsing is correct)
        expect(blockHasDisplayMetric(ctx, MetricType.Distance)).toBe(true);
    });

    it('distance metric has value 400 and unit "m" in block display memory', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Distance' });
        userNext(ctx);
        const metrics = blockDisplayMetrics(ctx);
        const distanceMetric = metrics.find(m => m.type === MetricType.Distance);
        expect(distanceMetric).toBeDefined();
        const v = distanceMetric?.value as Record<string, unknown> | undefined;
        expect(v?.amount).toBe(400);
        expect(distanceMetric?.unit ?? v?.unit).toBe('m');
    });

    it('distance metric is present on the runtime stack while block is active', () => {
        // The block is still on the stack (not yet popped), so the metric lives
        // in block display memory — use stackHasMetric rather than anyOutputHasMetric.
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Distance' });
        userNext(ctx);
        expect(stackHasMetric(ctx, MetricType.Distance)).toBe(true);
    });

    it('step 2: second userNext → clean termination (depth = 0)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Distance' });
        userNext(ctx);
        userNext(ctx);
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Effort — userNext Is Always Skippable
// A bare effort block (no timer prefix) completes immediately on userNext.
// Spec: effort.md#-effort---usernext-is-always-skippable
// ===========================================================================
describe('🟢 Effort — userNext Is Always Skippable (10 Pullups)', () => {
    const SCRIPT = '10 Pullups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('userNext immediately mounts effort', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Skippable' });
        userNext(ctx); // WaitingToStart → Effort
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('second userNext immediately pops effort regardless of elapsed time', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Skippable' });
        userNext(ctx); // mount
        userNext(ctx); // pop immediately — no minimum hold time
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('completionReason is user-advance for effort block (via system event)', () => {
        // completionReason lives in system pop events, not in completion outputs
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Skippable' });
        userNext(ctx);
        userNext(ctx);
        expect(anySystemPopHasReason(ctx, 'user-advance')).toBe(true);
    });

    it('no time advance needed — userNext any time completes it', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Skippable' });
        userNext(ctx); // mount
        // No advanceClock at all — should still complete
        userNext(ctx);
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Effort with Timed Rest After (Skippable)
// :30 Rest is advisory — userNext dismisses it early OR timer auto-completes.
// Spec: effort.md#-effort-with-timed-rest-after-skippable
// ===========================================================================
describe('🟢 Effort with Skippable Rest (:30 Rest)', () => {
    const SCRIPT = '10 Pullups\n:30 Rest\n10 Pushups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 0: startSession → depth = 2', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: userNext → Pullups effort mounted', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('step 2: second userNext → Rest/Timer block becomes current', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // Pullups
        userNext(ctx); // :30 Rest
        expect(currentBlockType(ctx)).toMatch(/Rest|Timer/i);
    });

    it('step 3a: userNext on :30 Rest skips it — Pushups become current immediately', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // Pullups
        userNext(ctx); // :30 Rest mounted
        expect(currentBlockType(ctx)).toMatch(/Rest|Timer/i);
        userNext(ctx); // skip rest early
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('step 3b: advanceClock(30_000) auto-expires :30 Rest → Pushups become current', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // Pullups
        userNext(ctx); // :30 Rest mounted
        advanceClock(ctx, 30_000); // rest auto-expires
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('rest completionReason is user-advance when skipped early (via system event)', () => {
        // completionReason lives in system pop events, not in completion outputs
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // Pullups
        userNext(ctx); // :30 Rest mounted
        userNext(ctx); // skip
        userNext(ctx); // Pushups done
        expect(anySystemPopHasReason(ctx, 'user-advance')).toBe(true);
    });

    it('step 4: after rest, final userNext completes Pushups → session ends', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'SkipRest' });
        userNext(ctx); // Pullups
        userNext(ctx); // :30 Rest
        userNext(ctx); // skip rest → Pushups
        userNext(ctx); // done
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Effort with Forced Rest After (Cannot Skip)
// *:30 Rest — userNext MUST be a no-op while the countdown is active.
//
// Spec: effort.md#-effort-with-forced-rest-after-cannot-skip
//
// The `*` prefix sets `behavior.required_timer` hint which configures
// ExitBehavior with onNext:false so userNext is suppressed until timer fires.
// ===========================================================================
describe('🟢 Effort with Forced Rest After (*:30 — Cannot Skip)', () => {
    const SCRIPT = '10 Pullups\n*:30 Rest\n10 Pushups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    /** Helper: drive to the point where forced rest is the current block. */
    function enterForcedRest() {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForcedRest' });
        userNext(ctx); // WaitingToStart → Pullups
        userNext(ctx); // Pullups → *:30 forced Rest
    }

    it('step 2: forced rest block is mounted after Pullups', () => {
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
        // All three skips suppressed; stack is unchanged
        expect(ctx.runtime.stack.count).toBe(depthAtRest);
    });

    it('forced rest block remains current after userNext attempts', () => {
        enterForcedRest();
        userNext(ctx); // no-op attempt
        expect(currentBlockType(ctx)).toMatch(/Rest|Timer/i);
    });

    it('advanceClock(30_000) expires the forced rest → auto-pops → Pushups next', () => {
        enterForcedRest();
        advanceClock(ctx, 30_000); // forced rest timer fires
        // Forced rest auto-popped; Pushups effort mounted
        expect(currentBlockType(ctx)).toMatch(/effort/i);
    });

    it('forced rest completionReason is never user-advance (via system events)', () => {
        // The Pullups pop will have 'user-advance' (correct).
        // The forced rest pop must NOT have 'user-advance' — it must be timer-expiry.
        // System events carry completionReason in metric.value.
        enterForcedRest();
        advanceClock(ctx, 30_000); // rest timer fires → auto-pop

        const systemPops = ctx.tracer.outputs
            .filter(o => o.outputType === 'system')
            .map(o => {
                const m = o.raw.metrics.find(m => m.type === MetricType.System);
                return m?.value as Record<string, unknown> | undefined;
            })
            .filter(v => v?.event === 'pop');

        // The most recent pop is the forced rest block (Pushups not done yet)
        const lastPop = systemPops.at(-1);
        expect(lastPop?.completionReason).not.toBe('user-advance');
    });

    it('after forced rest expires, userNext completes Pushups → session ends', () => {
        enterForcedRest();
        advanceClock(ctx, 30_000); // rest expires → Pushups pushed
        userNext(ctx); // complete Pushups
        expect(ctx.runtime.stack.count).toBe(0);
    });
});
