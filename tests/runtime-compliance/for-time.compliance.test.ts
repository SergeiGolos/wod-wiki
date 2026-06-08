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
import { TestScript, assertions } from '@/testing/script';
import { MetricType } from '@/core/models/Metric';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the blockType of the top-of-stack block, or undefined when empty.
 */
function currentBlockType(state: ScriptState): string | undefined {
    return state.current?.blockType;
}

/**
 * Checks whether any system pop event carries the given completionReason.
 * The completionReason lives in the system event's metric.value, not in
 * the completion output's completionReason field.
 */
function anySystemPopHasReason(state: ScriptState, reason: string): boolean {
    return assertions(state).outputs().all()
        .filter(o => o.outputType === 'system')
        .some(o => {
            const sysMetric = [...o.metrics].find(m => m.type === MetricType.System);
            const v = sysMetric?.value as Record<string, unknown> | undefined;
            return v?.event === 'pop' && v?.completionReason === reason;
        });
}

/**
 * Returns system pop event values from the tracer, in emission order.
 */
function systemPopValues(state: ScriptState): Array<Record<string, unknown>> {
    return assertions(state).outputs().all()
        .filter(o => o.outputType === 'system')
        .map(o => {
            const m = [...o.metrics].find(m => m.type === MetricType.System);
            return m?.value as Record<string, unknown> | undefined;
        })
        .filter((v): v is Record<string, unknown> => !!v && v['event'] === 'pop');
}

/**
 * Checks if the current block's display memory contains a metric of the given type.
 */
function blockHasDisplayMetric(state: ScriptState, metricType: MetricType | string): boolean {
    const block = state.current;
    if (!block) return false;
    return block.getMemoryByTag('metric:display')
        .flatMap(loc => loc.metrics.toArray())
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
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('step 0: startSession → SessionRoot + WaitingToStart (depth = 2)', async () => {
        script = await TestScript.compile(SCRIPT);
        expect((await script.snapshot()).depth).toBe(2);
    });

    it('step 1: first userNext → effort block mounted (WaitingToStart pops)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        expect(await currentBlockType(await script.snapshot())).toMatch(/effort/i);
    });

    it('step 1: effort block is at depth ≥ 2 (SessionRoot + Effort)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        expect((await script.snapshot()).depth).toBeGreaterThanOrEqual(2);
    });

    it('step 1: resistance metric (135lb) is stored in block display memory', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        expect(await blockHasDisplayMetric(await script.snapshot(), MetricType.Resistance)).toBe(true);
    });

    it('step 2: second userNext → effort pops, session ends (depth = 0)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // mount effort
        await script.next(); // complete effort
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('no timer involved — no countdown block appears at any point', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        // No timer or countdown block should appear on the stack
        const hasTimer = (await script.snapshot()).blocks.some(b =>
            /timer|countdown/i.test(b.blockType ?? '')
        );
        expect(hasTimer).toBe(false);
    });

    it('completionReason is user-advance for effort (via system event)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.next();
        expect(await anySystemPopHasReason(await script.snapshot(), 'user-advance')).toBe(true);
    });

    it('all outputs are paired (segment + completion for every block)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.next();
        const unpaired = assertions(await script.snapshot()).outputs().assertPairedOutputs();
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
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    async function oneRound() {
        await script.next(); // Thrusters
        await script.next(); // Pullups
    }

    it('step 0: startSession → depth = 2 (SessionRoot + WaitingToStart)', async () => {
        script = await TestScript.compile(SCRIPT);
        expect((await script.snapshot()).depth).toBe(2);
    });

    it('step 1: first userNext → loop/rounds block and first exercise pushed', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // WaitingToStart → Round 1 / Thrusters
        // Stack should be at least: SessionRoot + Loop + Effort
        expect((await script.snapshot()).depth).toBeGreaterThanOrEqual(3);
    });

    it('step 1: current block is an effort type (Thrusters)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        expect(await currentBlockType(await script.snapshot())).toMatch(/effort/i);
    });

    it('steps 1-2: round 1 has 2 exercises (Thrusters → Pullups)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start → Thrusters R1
        await script.next(); // Thrusters → Pullups R1
        expect(await currentBlockType(await script.snapshot())).toMatch(/effort/i);
        // Stack still has loop block
        expect((await script.snapshot()).depth).toBeGreaterThanOrEqual(2);
    });

    it('completes all 3 rounds with 6 userNexts after start', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start
        await oneRound(); // R1: 21 reps each
        await oneRound(); // R2: 15 reps each
        await oneRound(); // R3: 9 reps each
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('session ends after exactly 3 rounds × 2 exercises = 6 userNexts', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start
        for (let i = 0; i < 6; i++) {
            expect((await script.snapshot()).depth).toBeGreaterThan(0);
            await script.next();
        }
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('all outputs are paired (segment + completion for every block)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await oneRound();
        await oneRound();
        await oneRound();
        const unpaired = assertions(await script.snapshot()).outputs().assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });

    it('total outputs are sufficient for 3 rounds + session overhead', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await oneRound();
        await oneRound();
        await oneRound();
        // At minimum: SessionRoot(2) + WaitingToStart(2) + Loop(2) + 6 Efforts(12) = 18
        expect(assertions(await script.snapshot()).outputs().count()).toBeGreaterThanOrEqual(18);
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
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    async function oneRound() {
        await script.next(); // Thrusters
        await script.next(); // Pullups
    }

    it('startSession → depth = 2 (SessionRoot + WaitingToStart)', async () => {
        script = await TestScript.compile(SCRIPT);
        expect((await script.snapshot()).depth).toBe(2);
    });

    it('first userNext starts the rep-scheme loop and pushes first exercise', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        expect((await script.snapshot()).depth).toBeGreaterThanOrEqual(3);
        expect(await currentBlockType(await script.snapshot())).toMatch(/effort/i);
    });

    it('completes all 3 rounds with 6 userNexts after start (identical to For Time variant)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start
        await oneRound(); // R1
        await oneRound(); // R2
        await oneRound(); // R3
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('all outputs are paired', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await oneRound();
        await oneRound();
        await oneRound();
        const unpaired = assertions(await script.snapshot()).outputs().assertPairedOutputs();
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
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('step 0: startSession → depth = 2', async () => {
        script = await TestScript.compile(SCRIPT);
        expect((await script.snapshot()).depth).toBe(2);
    });

    it('step 1: first userNext → Thrusters effort mounted', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // WaitingToStart → Thrusters
        expect(await currentBlockType(await script.snapshot())).toMatch(/effort/i);
    });

    it('step 2: second userNext → :30 Rest/Timer block becomes current', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // Thrusters
        await script.next(); // :30 Rest
        expect(await currentBlockType(await script.snapshot())).toMatch(/Rest|Timer/i);
    });

    it('step 3a: userNext on :30 Rest skips it — Pull-ups become current immediately', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // Thrusters
        await script.next(); // :30 Rest mounted
        expect(await currentBlockType(await script.snapshot())).toMatch(/Rest|Timer/i);
        await script.next(); // skip rest → Pull-ups
        expect(await currentBlockType(await script.snapshot())).toMatch(/effort/i);
    });

    it('step 3a: rest dismissed via userNext carries completionReason = "user-advance"', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // Thrusters
        await script.next(); // :30 Rest mounted
        await script.next(); // skip rest
        expect(await anySystemPopHasReason(await script.snapshot(), 'user-advance')).toBe(true);
    });

    it('step 3b: advanceClock(30_000) auto-expires :30 Rest → Pull-ups become current', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // Thrusters
        await script.next(); // :30 Rest mounted
        await script.tick(30_000); // rest timer fires
        expect(await currentBlockType(await script.snapshot())).toMatch(/effort/i);
    });

    it('step 3b: auto-expired rest does NOT carry completionReason = "user-advance"', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // Thrusters
        await script.next(); // :30 Rest mounted
        await script.tick(30_000); // rest auto-expires
        // The rest block's system pop should NOT be 'user-advance'
        const pops = await systemPopValues(await script.snapshot());
        const lastPop = pops.at(-1);
        expect(lastPop?.completionReason).not.toBe('user-advance');
    });

    it('session ends cleanly after skipping rest and completing Pull-ups', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // Thrusters
        await script.next(); // :30 Rest
        await script.next(); // skip rest → Pull-ups
        await script.next(); // Pull-ups done → session ends
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('session ends cleanly after waiting for rest to expire and completing Pull-ups', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // Thrusters
        await script.next(); // :30 Rest
        await script.tick(30_000); // rest auto-expires → Pull-ups
        await script.next(); // Pull-ups done
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('all outputs are paired when rest is skipped', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.next();
        await script.next();
        await script.next();
        const unpaired = assertions(await script.snapshot()).outputs().assertPairedOutputs();
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
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    /** Helper: drive to the point where *:30 forced Rest is the current block. */
    async function enterForcedRest() {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // WaitingToStart → Thrusters
        await script.next(); // Thrusters → *:30 forced Rest
    }

    it('step 2: forced rest/timer block is mounted after Thrusters', async () => {
        await enterForcedRest();
        expect(await currentBlockType(await script.snapshot())).toMatch(/Rest|Timer/i);
    });

    it('step 3: userNext during *:30 forced rest is a no-op — stack depth unchanged', async () => {
        await enterForcedRest();
        const depthAtRest = (await script.snapshot()).depth;
        await script.next(); // attempt skip — MUST be suppressed
        expect((await script.snapshot()).depth).toBe(depthAtRest);
    });

    it('multiple userNext calls during *:30 forced rest all produce zero stack changes', async () => {
        await enterForcedRest();
        const depthAtRest = (await script.snapshot()).depth;
        await script.next();
        await script.next();
        await script.next();
        expect((await script.snapshot()).depth).toBe(depthAtRest);
    });

    it('forced rest remains the current block after userNext attempt', async () => {
        await enterForcedRest();
        await script.next(); // attempt skip — suppressed
        expect(await currentBlockType(await script.snapshot())).toMatch(/Rest|Timer/i);
    });

    it('advanceClock(30_000) expires forced rest → auto-pops → Pull-ups become current', async () => {
        await enterForcedRest();
        await script.tick(30_000); // forced rest timer fires
        expect(await currentBlockType(await script.snapshot())).toMatch(/effort/i);
    });

    it('forced rest completionReason is never "user-advance" (via system events)', async () => {
        await enterForcedRest();
        await script.next(); // suppressed no-op
        await script.tick(30_000); // rest auto-pops

        const pops = await systemPopValues(await script.snapshot());
        // Last pop is the forced rest auto-completing
        const lastPop = pops.at(-1);
        expect(lastPop?.completionReason).not.toBe('user-advance');
    });

    it('userNext attempts + timer expiry: no forced-rest pop has "user-advance"', async () => {
        await enterForcedRest();
        await script.next(); // suppressed
        await script.next(); // suppressed
        await script.tick(30_000); // timer fires

        // The Thrusters pop IS 'user-advance' (correct for a skippable effort).
        // The forced rest pop must NOT be 'user-advance'.
        // We verify the last pop — the forced rest auto-pop — is not user-advance.
        const pops = await systemPopValues(await script.snapshot());
        const lastPop = pops.at(-1);
        expect(lastPop?.completionReason).not.toBe('user-advance');
    });

    it('after forced rest expires, userNext completes Pull-ups → session ends', async () => {
        await enterForcedRest();
        await script.tick(30_000); // forced rest auto-pops → Pull-ups
        await script.next(); // Pull-ups done
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('all outputs are paired after complete run including forced rest', async () => {
        await enterForcedRest();
        await script.tick(30_000); // forced rest auto-pops
        await script.next(); // Pull-ups
        const unpaired = assertions(await script.snapshot()).outputs().assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});
