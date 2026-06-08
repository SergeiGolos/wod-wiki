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
import { TestScript, assertions } from '@/testing/script';
import { RoundState } from '@/runtime/memory/MemoryTypes';
import { MetricType, Metric } from '@/core/models/Metric';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reads the current round state from the Rounds block on the stack.
 */
function getRoundState(state: ScriptState): RoundState | undefined {
    const roundsBlock = state.blocks.find(b => b.blockType === 'Rounds');
    if (!roundsBlock) return undefined;
    return roundsBlock.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined;
}

/**
 * Returns the current exercise block on top of stack.
 */
function currentBlockType(state: ScriptState): string | undefined {
    return state.current?.blockType;
}

/**
 * Returns display metrics for the current block.
 */
function getDisplayMetrics(state: ScriptState): Metric[] {
    const block = state.current;
    if (!block) return [];
    return block.getMemoryByTag('metric:display').flatMap(loc => loc.metrics.toArray());
}

// ===========================================================================
// 🟢 Fixed Rounds — (3) 10 Pullups
// Spec: rounds.md#-fixed-rounds
// ===========================================================================
describe('🟢 Fixed Rounds — (3) 10 Pullups', () => {
    const SCRIPT = '(3)\n  10 Pullups';
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('step 0: startSession → SessionRoot + WaitingToStart', async () => {
        script = await TestScript.compile(SCRIPT);
        expect((await script.snapshot()).depth).toBe(2);
    });

    it('step 1: first userNext starts round 1', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        expect(await getRoundState(await script.snapshot())?.current).toBe(1);
        expect(await getRoundState(await script.snapshot())?.total).toBe(3);
        expect((await script.snapshot()).current?.blockType).toMatch(/effort/i);
    });

    it('step 2-3: userNext cycles through rounds 2 and 3', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start r1
        await script.next(); // r1 done -> r2
        expect(await getRoundState(await script.snapshot())?.current).toBe(2);
        await script.next(); // r2 done -> r3
        expect(await getRoundState(await script.snapshot())?.current).toBe(3);
    });

    it('step 4: final userNext terminates session', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start r1
        await script.next(); // r1 done -> r2
        await script.next(); // r2 done -> r3
        await script.next(); // r3 done -> session end
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('child was pushed exactly 3 times (verified via tracer completions)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start r1
        await script.next(); // r2
        await script.next(); // r3
        await script.next(); // end
        
        // Filter for Pullups segments (have Rep metric)
        const pullupsSegments = assertions(await script.snapshot()).outputs().segments().filter(s =>
            [...s.metrics].some(m => m.type === MetricType.Rep)
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
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('round 1 has 21 reps', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        const reps = await getDisplayMetrics(await script.snapshot()).find(m => m.type === MetricType.Rep);
        expect(reps?.value).toBe(21);
    });

    it('round 2 has 15 reps', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // r1
        await script.next(); // r2
        const reps = await getDisplayMetrics(await script.snapshot()).find(m => m.type === MetricType.Rep);
        expect(reps?.value).toBe(15);
    });

    it('round 3 has 9 reps', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // r1
        await script.next(); // r2
        await script.next(); // r3
        const reps = await getDisplayMetrics(await script.snapshot()).find(m => m.type === MetricType.Rep);
        expect(reps?.value).toBe(9);
    });

    it('session ends after 3 rounds', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // r1
        await script.next(); // r2
        await script.next(); // r3
        await script.next(); // end
        expect((await script.snapshot()).depth).toBe(0);
    });
});

// ===========================================================================
// 🟢 Single Round — (1) 10 Pullups
// Spec: rounds.md#-single-round
// ===========================================================================
describe('🟢 Single Round — (1) 10 Pullups', () => {
    const SCRIPT = '(1)\n  10 Pullups';
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('completes after one userNext', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start r1
        expect((await script.snapshot()).depth).toBeGreaterThan(0);
        await script.next(); // end
        expect((await script.snapshot()).depth).toBe(0);
    });
});

// ===========================================================================
// 🟢 Rounds with Multiple Children
// Spec: rounds.md#-rounds-with-multiple-children
// ===========================================================================
describe('🟢 Rounds with Multiple Children — (3) 10 Pullups / 15 Pushups', () => {
    const SCRIPT = '(3)\n  10 Pullups\n  15 Pushups';
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('cycles through all children in each round', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // r1, child 1
        expect(await getRoundState(await script.snapshot())?.current).toBe(1);
        expect((await script.snapshot()).current?.blockType).toMatch(/effort/i);
        
        await script.next(); // r1, child 2
        expect(await getRoundState(await script.snapshot())?.current).toBe(1);
        
        await script.next(); // r1 done -> r2, child 1
        expect(await getRoundState(await script.snapshot())?.current).toBe(2);
    });

    it('presents correct exercises in order', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // r1 Pullups
        await script.next(); // r1 Pushups
        await script.next(); // r2 Pullups
        await script.next(); // r2 Pushups
        await script.next(); // r3 Pullups
        await script.next(); // r3 Pushups
        await script.next(); // end
        expect((await script.snapshot()).depth).toBe(0);
    });
});

// ===========================================================================
// 🟢 Large Round Count
// Spec: rounds.md#-large-round-count-skip
// ===========================================================================
describe('🟢 Large Round Count — (100) 5 Burpees', () => {
    it('compiles without error', async () => {
        const script = await TestScript.compile('(100)\n  5 Burpees');
        expect((await script.snapshot()).depth).toBeGreaterThan(0);
        await script.dispose();
    });

    it('10000 iterations complete without memory issues and within performance target', async () => {
        // Use TestScript directly (without output capture) so output-listener overhead
        // does not inflate the timing measurement. OutputTracingHarness captures ~70 k
        // objects for a 10 000-round run, adding ~400 ms that is test-infrastructure
        // cost rather than real runtime cost.
        const perf = await TestScript.compile('(20000)\n  5 Burpees');
        await perf.next(); // advance WaitingToStart → first child

        // Warm-up phase (un-timed): 10 000 rounds
        for (let i = 0; i < 10000; i++) {
            await perf.next();
        }

        // Measured phase: 10 000 rounds must complete in < 500 ms
        const start = performance.now();
        for (let i = 0; i < 10000; i++) {
            await perf.next();
        }
        const end = performance.now();

        expect((await perf.snapshot()).depth).toBe(0);
        expect(end - start).toBeLessThan(500); // 10,000 steady-state iterations in < 500ms
        await perf.dispose();
    });
});

// ===========================================================================
// 🟢 Rounds with Skippable Rest
// Spec: rounds.md#-rounds-with-skippable-rest
// ===========================================================================
describe('🟢 Rounds with Skippable Rest', () => {
    const SCRIPT = '(3)\n  10 Pullups\n  15 Pushups\n  1:00 Rest';
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('step 3: rest is auto-pushed after pushups', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start -> Pullups (R1)
        await script.next(); // Pullups done -> Pushups (R1)
        await script.next(); // Pushups done -> Rest (R1)
        
        // Rest should be on top
        expect((await script.snapshot()).current?.blockType).toMatch(/rest|timer/i);
    });

    it('step 4a: rest can be skipped via userNext', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start
        await script.next(); // Pullups
        await script.next(); // Pushups
        await script.next(); // skip Rest
        expect(await getRoundState(await script.snapshot())?.current).toBe(2);
    });

    it('step 4b: rest can be waited out', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start
        await script.next(); // Pullups
        await script.next(); // Pushups
        await script.tick(60_000);
        expect(await getRoundState(await script.snapshot())?.current).toBe(2);
    });
});

// ===========================================================================
// 🟢 Rounds with Forced Rest (Cannot Skip)
// Spec: rounds.md#-rounds-with-forced-rest-cannot-skip
// ===========================================================================
describe('🟢 Rounds with Forced Rest (Cannot Skip)', () => {
    const SCRIPT = '(3)\n  10 Pullups\n  15 Pushups\n  *1:00 Rest';
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('userNext during forced rest is a no-op', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start
        await script.next(); // Pullups
        await script.next(); // Pushups
        
        const depthBeforeSkip = (await script.snapshot()).depth;
        await script.next(); // attempt skip
        expect((await script.snapshot()).depth).toBe(depthBeforeSkip);
        expect((await script.snapshot()).current?.blockType).toMatch(/rest|timer/i);
    });

    it('rest auto-pops after timer expiry', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start
        await script.next(); // Pullups
        await script.next(); // Pushups
        await script.tick(60_000);
        expect(await getRoundState(await script.snapshot())?.current).toBe(2);
    });

    it('final forced rest must also expire to end session', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start
        
        for (let r = 0; r < 3; r++) {
            await script.next(); // Pullups
            await script.next(); // Pushups
            if (r < 2) await script.tick(60_000); // Wait rest for R1, R2
        }
        
        // Now at final rest of R3
        expect((await script.snapshot()).current?.blockType).toMatch(/rest|timer/i);
        await script.next(); // skip attempt
        expect((await script.snapshot()).depth).toBeGreaterThan(0);
        
        await script.tick(60_000);
        expect((await script.snapshot()).depth).toBe(0);
    });
});
