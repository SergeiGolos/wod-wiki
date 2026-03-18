/**
 * Metric Inheritance Compliance Tests
 *
 * Based on: docs/finishline/compliance-scenarios/metric-inheritance.md
 *
 * Covers weight/rep cascading and override scenarios for compliance phase 5.
 *
 * Legend:
 *   🟢 Expected to pass — behaviour is fully implemented
 *   🔴 Expected to FAIL (RED) — behaviour is not yet implemented
 *
 * Implementation Notes (from empirical probe 2026-03-18):
 *   - `@ 95 lb` at root level (same indent as sibling `(3)`) is parsed as a
 *     STANDALONE effort block, NOT as a parent-level weight context modifier.
 *     Downstream blocks at the same indentation do NOT inherit the weight.
 *   - `@ 95 lb` with indented children (e.g., `@ 95 lb\n  Clean`) DOES create
 *     a group scope, but child efforts still do NOT inherit the parent weight.
 *   - Weight stated directly on an exercise (`5 Thrusters @ 95 lb`) IS stored
 *     in that effort's display memory as Resistance.
 *   - Weight does NOT bleed from one sibling effort to another (correct).
 *
 * RED scenarios (currently failing):
 *   - 🔴 Weight Cascading — `@ 95 lb` group header does not propagate to child
 *     efforts inside `(3)` rounds — child efforts have no Resistance metric.
 *   - 🔴 Weight Override — child specifying `@ 135 lb` works (correct), but
 *     a sibling that does NOT specify a weight fails to inherit the parent's
 *     `@ 95 lb` (Snatch has no Resistance metric).
 *   - 🔴 Distance Unit Inheritance — `@ 400 m` at root does not cascade to
 *     child Run efforts inside `(3)` rounds.
 *   - 🔴 Three-Level Promotion — `@ 75 kg` at root does not cascade through
 *     EMOM → Rounds → Effort nesting hierarchy.
 *
 * Spec: docs/finishline/compliance-scenarios/metric-inheritance.md
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
 * Returns all display metrics for the current top-of-stack block (flat array).
 */
function currentDisplayMetrics(ctx: SessionTestContext) {
    const block = ctx.runtime.stack.current;
    if (!block) return [];
    return block.getMemoryByTag('metric:display').flatMap(loc => loc.metrics);
}

/**
 * Returns the Resistance metric value for the current block, or undefined if absent.
 */
function currentResistance(ctx: SessionTestContext): { amount: number | undefined; unit: string } | undefined {
    const metrics = currentDisplayMetrics(ctx);
    // Combine split resistance metrics (amount and unit may be stored separately).
    const amountMetric = metrics.find(
        m => m.type === MetricType.Resistance && (m.value as any)?.amount !== undefined,
    );
    const unitMetric = metrics.find(
        m => m.type === MetricType.Resistance && (m.value as any)?.unit !== undefined && (m.value as any)?.amount === undefined,
    );
    if (!amountMetric && !unitMetric) return undefined;
    const amount = (amountMetric?.value as any)?.amount as number | undefined;
    const unit = ((amountMetric?.value as any)?.unit || (unitMetric?.value as any)?.unit || '') as string;
    return { amount, unit };
}

/**
 * Returns the rep count for the current block, or undefined if absent.
 */
function currentReps(ctx: SessionTestContext): number | undefined {
    const metrics = currentDisplayMetrics(ctx);
    const rep = metrics.find(m => m.type === MetricType.Rep);
    return rep?.value as number | undefined;
}

/**
 * Returns the Distance metric for the current block, or undefined if absent.
 */
function currentDistance(ctx: SessionTestContext): { amount: number | undefined; unit: string } | undefined {
    const metrics = currentDisplayMetrics(ctx);
    const amountMetric = metrics.find(
        m => m.type === MetricType.Distance && (m.value as any)?.amount !== undefined,
    );
    const unitMetric = metrics.find(
        m => m.type === MetricType.Distance && (m.value as any)?.unit !== undefined,
    );
    if (!amountMetric && !unitMetric) return undefined;
    const amount = (amountMetric?.value as any)?.amount as number | undefined;
    const unit = ((amountMetric?.value as any)?.unit || (unitMetric?.value as any)?.unit || '') as string;
    return { amount, unit };
}

/**
 * Returns true when the current block's display metrics include a Resistance entry.
 */
function currentHasResistance(ctx: SessionTestContext): boolean {
    return currentDisplayMetrics(ctx).some(m => m.type === MetricType.Resistance);
}

/**
 * Returns true when the current block's display metrics include a Distance entry.
 */
function currentHasDistance(ctx: SessionTestContext): boolean {
    return currentDisplayMetrics(ctx).some(m => m.type === MetricType.Distance);
}

// ===========================================================================
// 🟢 Weight Inside AMRAP — sibling isolation
//
// Weight stated directly on one exercise (Thrusters @ 95 lb) must NOT bleed
// to the sibling exercise (Pushups) within the same AMRAP.
//
// Spec: metric-inheritance.md#-weight-inside-amrap
// ===========================================================================
describe('🟢 Weight Inside AMRAP — sibling weight isolation', () => {
    const SCRIPT = '10:00 AMRAP\n  5 Thrusters @ 95 lb\n  10 Pushups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 1: Thrusters effort is mounted after first userNext', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AMRAPWeight' });
        userNext(ctx);
        expect(ctx.runtime.stack.current?.label).toMatch(/thrusters/i);
    });

    it('Thrusters effort carries a Resistance metric (95 lb explicitly set)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AMRAPWeight' });
        userNext(ctx);
        expect(currentHasResistance(ctx)).toBe(true);
    });

    it('Thrusters resistance amount is 95', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AMRAPWeight' });
        userNext(ctx);
        const r = currentResistance(ctx);
        expect(r?.amount).toBe(95);
    });

    it('Thrusters resistance unit is lb', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AMRAPWeight' });
        userNext(ctx);
        const r = currentResistance(ctx);
        expect(r?.unit).toBe('lb');
    });

    it('Thrusters rep count is 5', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AMRAPWeight' });
        userNext(ctx);
        expect(currentReps(ctx)).toBe(5);
    });

    it('step 2: Pushups effort is mounted after second userNext', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AMRAPWeight' });
        userNext(ctx);
        userNext(ctx);
        expect(ctx.runtime.stack.current?.label).toMatch(/pushups/i);
    });

    it('Pushups effort carries NO Resistance metric (sibling weight must not bleed)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AMRAPWeight' });
        userNext(ctx); // Thrusters
        userNext(ctx); // Pushups
        expect(currentHasResistance(ctx)).toBe(false);
    });

    it('Pushups rep count is 10', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AMRAPWeight' });
        userNext(ctx);
        userNext(ctx);
        expect(currentReps(ctx)).toBe(10);
    });

    it('round 2: Thrusters still has 95 lb (not lost after one cycle)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AMRAPWeight' });
        userNext(ctx); // Thrusters R1
        userNext(ctx); // Pushups R1
        userNext(ctx); // Thrusters R2
        expect(currentHasResistance(ctx)).toBe(true);
        expect(currentResistance(ctx)?.amount).toBe(95);
    });

    it('round 2: Pushups R2 still has NO resistance metric', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AMRAPWeight' });
        userNext(ctx); // Thrusters R1
        userNext(ctx); // Pushups R1
        userNext(ctx); // Thrusters R2
        userNext(ctx); // Pushups R2
        expect(currentHasResistance(ctx)).toBe(false);
    });

    it('AMRAP timer fires at 10:00 — clean termination', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AMRAPWeight' });
        userNext(ctx);
        advanceClock(ctx, 600_000);
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🟢 Rep Scheme Promotion — (21-15-9) Thrusters + Pull-ups
//
// Each child exercise inside a round should receive the rep count for that
// round from the scheme. All children within the same round share the same
// rep count; consecutive rounds receive decreasing counts.
//
// Spec: metric-inheritance.md#-rep-scheme-promotion
// ===========================================================================
describe('🟢 Rep Scheme Promotion — (21-15-9) Thrusters + Pull-ups', () => {
    const SCRIPT = '(21-15-9)\n  Thrusters\n  Pull-ups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('Round 1 Thrusters — rep count is 21', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Fran' });
        userNext(ctx); // start → Round 1 → Thrusters
        expect(currentReps(ctx)).toBe(21);
    });

    it('Round 1 Pull-ups — rep count is 21 (same round, same count)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Fran' });
        userNext(ctx); // Thrusters R1
        userNext(ctx); // Pull-ups R1
        expect(currentReps(ctx)).toBe(21);
    });

    it('Round 2 Thrusters — rep count decreases to 15', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Fran' });
        userNext(ctx); // Thrusters R1
        userNext(ctx); // Pull-ups R1
        userNext(ctx); // Thrusters R2
        expect(currentReps(ctx)).toBe(15);
    });

    it('Round 2 Pull-ups — rep count is 15', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Fran' });
        userNext(ctx);
        userNext(ctx);
        userNext(ctx); // Thrusters R2
        userNext(ctx); // Pull-ups R2
        expect(currentReps(ctx)).toBe(15);
    });

    it('Round 3 Thrusters — rep count decreases to 9', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Fran' });
        userNext(ctx);
        userNext(ctx);
        userNext(ctx);
        userNext(ctx); // Pull-ups R2
        userNext(ctx); // Thrusters R3
        expect(currentReps(ctx)).toBe(9);
    });

    it('Round 3 Pull-ups — rep count is 9', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Fran' });
        for (let i = 0; i < 5; i++) userNext(ctx); // R1×2 + R2×2 + R3 Thrusters
        userNext(ctx); // Pull-ups R3
        expect(currentReps(ctx)).toBe(9);
    });

    it('completing all 6 child advances terminates session', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Fran' });
        for (let i = 0; i < 7; i++) userNext(ctx); // 3 rounds × 2 children + start
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ===========================================================================
// 🔴 Weight Cascading — Parent group `@ 95 lb` cascades to round children
//
// When `@ 95 lb` is declared at the root level (same indent as `(3)`), the
// weight should cascade to every child effort in the subsequent rounds block.
// Currently `@ 95 lb` is parsed as a STANDALONE effort block at root level,
// NOT as a context-setting group modifier.  The subsequent rounds/effort
// blocks do NOT inherit the resistance.
//
// RED: these tests will fail until the parser and compiler support the
// `@`-prefix weight-context cascading semantics.
//
// Spec: metric-inheritance.md#-weight-cascading--parent-to-children
// ===========================================================================
describe('🔴 Weight Cascading — @ 95 lb cascades to round children', () => {
    // @ 95 lb at root level followed by (3) rounds with Clean & Jerk children.
    const SCRIPT = '@ 95 lb\n(3)\n  Clean & Jerk';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('after AMRAP/rounds block starts, Clean & Jerk effort has a Resistance metric', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Cascade' });
        // Advance past the root-level weight declaration into the rounds/effort
        userNext(ctx); // WaitingToStart → first block (could be @ 95 lb effort or rounds)
        // If @ 95 lb parses as standalone, advance again to reach the rounds child
        if (!ctx.runtime.stack.current?.label?.match(/clean/i)) {
            userNext(ctx); // advance into rounds → effort
        }
        // The current block should be a Clean & Jerk effort WITH resistance = 95 lb
        expect(currentHasResistance(ctx)).toBe(true);
    });

    it('Clean & Jerk carries resistance amount 95', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Cascade' });
        userNext(ctx);
        if (!ctx.runtime.stack.current?.label?.match(/clean/i)) {
            userNext(ctx);
        }
        expect(currentResistance(ctx)?.amount).toBe(95);
    });

    it('Clean & Jerk carries resistance unit lb', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Cascade' });
        userNext(ctx);
        if (!ctx.runtime.stack.current?.label?.match(/clean/i)) {
            userNext(ctx);
        }
        expect(currentResistance(ctx)?.unit).toBe('lb');
    });

    it('Round 2 Clean & Jerk still carries inherited 95 lb resistance', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Cascade' });
        userNext(ctx);
        if (!ctx.runtime.stack.current?.label?.match(/clean/i)) {
            userNext(ctx); // enter rounds → effort R1
        }
        userNext(ctx); // R1 done → R2 effort
        expect(currentHasResistance(ctx)).toBe(true);
        expect(currentResistance(ctx)?.amount).toBe(95);
    });

    it('Round 3 Clean & Jerk still carries inherited 95 lb resistance', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Cascade' });
        userNext(ctx);
        if (!ctx.runtime.stack.current?.label?.match(/clean/i)) {
            userNext(ctx);
        }
        userNext(ctx); // R2
        userNext(ctx); // R3
        expect(currentHasResistance(ctx)).toBe(true);
        expect(currentResistance(ctx)?.amount).toBe(95);
    });
});

// ===========================================================================
// 🔴 Weight Override — parent `@ 95 lb` + child `Clean @ 135 lb` + `Snatch`
//
// Clean explicitly overrides to 135 lb (child wins over parent) ← should PASS.
// Snatch does NOT specify a weight → should inherit parent's 95 lb ← FAILS.
//
// Currently, Snatch has NO Resistance metric (parent's weight is not inherited
// by children that don't specify their own weight).
//
// RED: the Clean override assertion passes.  The Snatch inheritance assertion
// fails until parent-weight cascading is implemented.
//
// Spec: metric-inheritance.md#-weight-override--child-overrides-parent
// ===========================================================================
describe('🔴 Weight Override — child overrides parent; sibling inherits parent', () => {
    // Clean has its own @ 135 lb; Snatch inherits parent @ 95 lb.
    const SCRIPT = '@ 95 lb\n  Clean @ 135 lb\n  Snatch';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('Clean effort is the first child mounted after startSession + userNext', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Override' });
        userNext(ctx);
        expect(ctx.runtime.stack.current?.label).toMatch(/clean/i);
    });

    it('Clean effort carries a Resistance metric (overridden to 135 lb)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Override' });
        userNext(ctx);
        expect(currentHasResistance(ctx)).toBe(true);
    });

    it('Clean resistance amount is 135 (child override wins)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Override' });
        userNext(ctx);
        expect(currentResistance(ctx)?.amount).toBe(135);
    });

    it('Clean resistance unit is lb', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Override' });
        userNext(ctx);
        expect(currentResistance(ctx)?.unit).toBe('lb');
    });

    it('Snatch effort is mounted after second userNext (Clean completes)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Override' });
        userNext(ctx); // Clean
        userNext(ctx); // Snatch
        expect(ctx.runtime.stack.current?.label).toMatch(/snatch/i);
    });

    it('Snatch effort carries a Resistance metric (inherited from parent @ 95 lb)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Override' });
        userNext(ctx);
        userNext(ctx);
        // RED: will fail — Snatch has no Resistance in current implementation
        expect(currentHasResistance(ctx)).toBe(true);
    });

    it('Snatch resistance amount is 95 (parent default, no override)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Override' });
        userNext(ctx);
        userNext(ctx);
        // RED: will fail — Snatch has no Resistance in current implementation
        expect(currentResistance(ctx)?.amount).toBe(95);
    });

    it('Snatch resistance unit is lb (inherited from parent)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Override' });
        userNext(ctx);
        userNext(ctx);
        // RED: will fail — Snatch has no Resistance in current implementation
        expect(currentResistance(ctx)?.unit).toBe('lb');
    });
});

// ===========================================================================
// 🔴 Distance Unit Inheritance — `@ 400 m` cascades to `(3)` Run children
//
// When `@ 400 m` is declared at root level, every child Run effort in the
// subsequent `(3)` rounds block should inherit the 400 m distance.
// Currently `@ 400 m` is parsed as a standalone effort block (same behaviour
// as `@ 95 lb`).  The Run efforts in the rounds block carry NO Distance metric.
//
// Spec: metric-inheritance.md#-distance-unit-inheritance-skip
// ===========================================================================
describe('🔴 Distance Unit Inheritance — @ 400 m cascades to round children', () => {
    const SCRIPT = '@ 400 m\n(3)\n  Run';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('RunN effort carries a Distance metric (400 m inherited from parent)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Dist' });
        userNext(ctx); // WaitingToStart → first block
        // Advance past the @ 400 m standalone effort if it parsed that way
        if (!ctx.runtime.stack.current?.label?.match(/run/i)) {
            userNext(ctx);
        }
        // RED: Run effort should have Distance metric of 400 m
        expect(currentHasDistance(ctx)).toBe(true);
    });

    it('Run effort distance amount is 400', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Dist' });
        userNext(ctx);
        if (!ctx.runtime.stack.current?.label?.match(/run/i)) {
            userNext(ctx);
        }
        // RED: will fail — Run has no Distance in current implementation
        expect(currentDistance(ctx)?.amount).toBe(400);
    });

    it('Run effort distance unit is m', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Dist' });
        userNext(ctx);
        if (!ctx.runtime.stack.current?.label?.match(/run/i)) {
            userNext(ctx);
        }
        // RED: will fail — Run has no Distance in current implementation
        expect(currentDistance(ctx)?.unit).toBe('m');
    });

    it('All 3 rounds have Run effort with inherited 400 m distance', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Dist' });
        userNext(ctx);
        if (!ctx.runtime.stack.current?.label?.match(/run/i)) {
            userNext(ctx);
        }
        // R1 should have distance
        expect(currentHasDistance(ctx)).toBe(true);
        userNext(ctx); // R2
        expect(currentHasDistance(ctx)).toBe(true);
        userNext(ctx); // R3
        expect(currentHasDistance(ctx)).toBe(true);
    });
});

// ===========================================================================
// 🔴 Three-Level Promotion — @ 75 kg → EMOM → Rounds → Effort
//
// A weight declared at the root level must propagate three levels deep:
//   root (@ 75 kg) → EMOM interval → round group → individual Clean effort
//
// Currently `@ 75 kg` is parsed as a standalone block when mixed with EMOM
// and round structures at the same indentation level.
//
// Spec: metric-inheritance.md#-three-level-promotion-skip
// ===========================================================================
describe('🔴 Three-Level Promotion — @ 75 kg through EMOM → Rounds → Effort', () => {
    // Structure: @ 75 kg / (5) 1:00 EMOM / nested (3) / Clean
    const SCRIPT = '@ 75 kg\n(5) 1:00 EMOM\n  (3)\n    Clean';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    /**
     * Helper: advance through the structure until we reach an effort labelled "Clean".
     * Returns false if we run out of stack (session ended) before finding Clean.
     */
    function advanceToClean(maxSteps = 10): boolean {
        for (let i = 0; i < maxSteps; i++) {
            if (ctx.runtime.stack.current?.label?.match(/clean/i)) return true;
            if (ctx.runtime.stack.count === 0) return false;
            userNext(ctx);
        }
        return ctx.runtime.stack.current?.label?.match(/clean/i) !== null;
    }

    it('Clean effort is reachable in the nested structure', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ThreeLevel' });
        userNext(ctx); // start
        const found = advanceToClean();
        expect(found).toBe(true);
    });

    it('Clean effort carries a Resistance metric (75 kg from root @ 75 kg)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ThreeLevel' });
        userNext(ctx);
        advanceToClean();
        // RED: will fail — Clean has no Resistance in current implementation
        expect(currentHasResistance(ctx)).toBe(true);
    });

    it('Clean effort resistance amount is 75', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ThreeLevel' });
        userNext(ctx);
        advanceToClean();
        // RED: will fail — Clean has no Resistance in current implementation
        expect(currentResistance(ctx)?.amount).toBe(75);
    });

    it('Clean effort resistance unit is kg', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ThreeLevel' });
        userNext(ctx);
        advanceToClean();
        // RED: will fail — Clean has no Resistance in current implementation
        expect(currentResistance(ctx)?.unit).toBe('kg');
    });

    it('Second Clean iteration (different EMOM interval) still carries 75 kg', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ThreeLevel' });
        userNext(ctx);
        advanceToClean(); // find first Clean
        userNext(ctx);    // complete first Clean
        // Now advance to the second Clean (next round/interval)
        advanceClock(ctx, 60_000); // EMOM interval ticks over
        advanceToClean();
        // RED: second iteration should also carry 75 kg but currently has none
        expect(currentHasResistance(ctx)).toBe(true);
        expect(currentResistance(ctx)?.amount).toBe(75);
    });
});
