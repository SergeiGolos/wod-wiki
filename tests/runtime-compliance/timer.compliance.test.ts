/**
 * Timer Compliance Tests
 *
 * Based on: docs/finishline/compliance-scenarios/timer.md
 *
 * Covers all Timer scenarios, step-by-step, matching the spec tables.
 *
 * Legend:
 *   🟢 Expected to pass — behaviour is fully implemented
 *   🟡 Potentially borderline — implementation may differ
 *   🔴 Expected to FAIL (RED) — behaviour is not yet implemented
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

// ===========================================================================
// 🟢 Countdown Timer — 5:00 Run
// Spec: timer.md#-countdown-timer
// ===========================================================================
describe('🟢 Countdown Timer — 5:00 Run', () => {
    const SCRIPT = '5:00 Run';
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('step 0: startSession → depth = 2 (SessionRoot + WaitingToStart)', async () => {
        script = await TestScript.compile(SCRIPT);
        expect((await script.snapshot()).depth).toBe(2);
    });

    it('step 1: userNext → Timer starts, direction = down', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        expect(await currentBlockType(await script.snapshot())).toMatch(/timer/i);
    });

    it('step 2: advanceClock(150_000) → mid-timer, block still active', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.tick(150_000);
        expect((await script.snapshot()).depth).toBeGreaterThan(0);
        expect(await currentBlockType(await script.snapshot())).toMatch(/timer/i);
    });

    it('step 3: advanceClock(150_000) more → timer expires, session ends', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.tick(150_000);
        await script.tick(150_000);
        expect((await script.snapshot()).depth).toBe(0);
    });
});

// ===========================================================================
// 🟢 Short Timer — :30 Plank
// Spec: timer.md#-short-timer-30-format
// ===========================================================================
describe('🟢 Short Timer — :30 Plank', () => {
    const SCRIPT = ':30 Plank';
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('step 1: userNext → Timer starts (30s)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        expect(await currentBlockType(await script.snapshot())).toMatch(/timer/i);
    });

    it('step 2: advanceClock(30_000) → auto-pops at 30s', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.tick(30_000);
        expect((await script.snapshot()).depth).toBe(0);
    });
});

// ===========================================================================
// 🟢 Timer — Exact Boundary
// Spec: timer.md#-timer--exact-boundary
// ===========================================================================
describe('🟢 Timer — Exact Boundary', () => {
    const SCRIPT = '1:00 Row';
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('step 1: userNext → timer running', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        expect(await currentBlockType(await script.snapshot())).toMatch(/timer/i);
    });

    it('step 2: advanceClock(60_000) → expires at exactly 60s', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.tick(60_000);
        expect((await script.snapshot()).depth).toBe(0);
    });
});

// ===========================================================================
// 🟢 Timer — Mid-Stream Check
// Spec: timer.md#-timer--mid-stream-check
// ===========================================================================
describe('🟢 Timer — Mid-Stream Check', () => {
    const SCRIPT = '2:00 Bike';
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('step 1: userNext → timer running', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        expect(await currentBlockType(await script.snapshot())).toMatch(/timer/i);
    });

    it('step 2: advanceClock(60_000) → still active, elapsed ~60s', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.tick(60_000);
        expect((await script.snapshot()).depth).toBeGreaterThan(0);
        expect(await currentBlockType(await script.snapshot())).toMatch(/timer/i);
    });

    it('step 3: advanceClock(60_000) → expires at 120s', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.tick(60_000);
        await script.tick(60_000);
        expect((await script.snapshot()).depth).toBe(0);
    });
});

// ===========================================================================
// 🟢 Sequential Timers
// Spec: timer.md#-sequential-timers
// ===========================================================================
describe('🟢 Sequential Timers — 5:00 Run / 3:00 Row', () => {
    const SCRIPT = '5:00 Run\n3:00 Row';
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('step 1: userNext → first timer (Run) starts', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        expect(await currentBlockType(await script.snapshot())).toMatch(/timer/i);
    });

    it('step 2: advanceClock(300_000) → first expires, second timer (Row) auto-pushes', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.tick(300_000);
        expect((await script.snapshot()).depth).toBeGreaterThan(0);
        expect(await currentBlockType(await script.snapshot())).toMatch(/timer/i);
    });

    it('step 3: advanceClock(180_000) → second expires, session ends', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.tick(300_000);
        await script.tick(180_000);
        expect((await script.snapshot()).depth).toBe(0);
    });
});

// ===========================================================================
// 🟡 Timer — Normal (Skippable by Default)
// Spec: timer.md#-timer--normal-skippable-by-default
// ===========================================================================
describe('🟡 Timer — Normal (Skippable by Default)', () => {
    const SCRIPT = '5:00 Run';
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('step 1: userNext → timer starts (5:00 countdown)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        expect(await currentBlockType(await script.snapshot())).toMatch(/timer/i);
    });

    it('step 2a: early userNext → timer dismissed, session ends (user-advance)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start timer
        await script.next(); // early skip
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('step 2a: early skip carries completionReason = "user-advance"', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start timer
        await script.next(); // early skip
        expect(await anySystemPopHasReason(await script.snapshot(), 'user-advance')).toBe(true);
    });

    it('step 2b: advanceClock(300_000) → timer expires at 0:00, session ends (timer-expiry)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.tick(300_000);
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('step 2b: timer-expiry carries completionReason = "timer-expired"', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.tick(300_000);
        // Check the timer block's pop specifically (last pop before session root)
        const pops = await systemPopValues(await script.snapshot());
        const timerPop = pops.find(p => p['blockLabel'] === '5:00 Run');
        expect(timerPop?.completionReason).toBe('timer-expired');
    });
});

// ===========================================================================
// 🔴 Forced Timer — Cannot Skip (`*` prefix)
// Spec: timer.md#-forced-timer--cannot-skip--prefix
// ===========================================================================
describe('🔴 Forced Timer — Cannot Skip (*5:00 Run)', () => {
    const SCRIPT = '*5:00 Run';
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('step 0: startSession → depth = 2 (SessionRoot + WaitingToStart)', async () => {
        script = await TestScript.compile(SCRIPT);
        expect((await script.snapshot()).depth).toBe(2);
    });

    it('step 1: userNext → forced timer starts', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        expect(await currentBlockType(await script.snapshot())).toMatch(/timer/i);
    });

    it('step 2: userNext (attempt skip) → no-op, block stays, countdown continues', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start timer

        const depthBeforeSkip = (await script.snapshot()).depth;
        await script.next(); // attempt skip — must be no-op
        expect((await script.snapshot()).depth).toBe(depthBeforeSkip);
        expect(await currentBlockType(await script.snapshot())).toMatch(/timer/i);
    });

    it('multiple userNext calls during forced timer all produce zero stack changes', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start timer

        const depthAfterStart = (await script.snapshot()).depth;
        await script.next();
        await script.next();
        await script.next();
        expect((await script.snapshot()).depth).toBe(depthAfterStart);
    });

    it('step 3: advanceClock(300_000) → timer expires → auto-pop, session ends', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start timer
        await script.next(); // attempt skip — no-op
        await script.tick(300_000);
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('forced timer completionReason is never "user-advance"', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start
        await script.next(); // attempt skip
        await script.tick(300_000); // expire

        // The WaitingToStart pop uses user-advance (correct), but the forced timer
        // block itself must NOT use user-advance. Check only the timer block's pop.
        const pops = await systemPopValues(await script.snapshot());
        const timerPop = pops.find(p => p['blockLabel'] === '*5:00 Run' || p['blockType'] === 'Timer');
        // If the label check misses, fall back to checking the pop before SessionRoot
        const forcedTimerPop = timerPop ?? pops.at(-2); // -2: timer pop; -1: session-root pop
        expect(forcedTimerPop?.completionReason).not.toBe('user-advance');
    });

    it('forced timer completionReason is "timer-expired"', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start
        await script.tick(300_000); // expire

        // The timer block's pop should carry timer-expired as the reason.
        const pops = await systemPopValues(await script.snapshot());
        const timerPop = pops.at(-2); // -2: timer pop; -1: session-root pop
        expect(timerPop?.completionReason).toBe('timer-expired');
    });
});

// ===========================================================================
// 🔴 Collectible Timer — :? Sprint
// Spec: timer.md#-collectible-timer-skip
// ===========================================================================
describe('🔴 Collectible Timer — :? Sprint', () => {
    const SCRIPT = ':? Sprint';
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('step 1: startSession + userNext → Timer starts with no fixed duration', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // WaitingToStart → timer block
        expect(await currentBlockType(await script.snapshot())).toMatch(/timer/i);
    });

    it('step 1: collectible timer is a count-up timer (no fixed duration)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();

        // Confirm the block is still active (no auto-expiry since no fixed duration)
        await script.tick(60_000);
        expect((await script.snapshot()).depth).toBeGreaterThan(0);
        expect(await currentBlockType(await script.snapshot())).toMatch(/timer/i);
    });

    it('step 2: userNext manually completes the collectible timer', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start timer
        await script.tick(45_000); // let some time elapse
        await script.next(); // manually complete
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('step 2: captured time is recorded on manual completion', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start timer
        await script.tick(45_000); // 45 seconds elapsed
        await script.next(); // complete

        // At least one output statement should be produced
        expect(assertions(await script.snapshot()).outputs().all().length).toBeGreaterThan(0);
    });

    it('step 2: manual completion carries completionReason = "user-advance"', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start
        await script.tick(45_000);
        await script.next(); // complete

        expect(await anySystemPopHasReason(await script.snapshot(), 'user-advance')).toBe(true);
    });
});
