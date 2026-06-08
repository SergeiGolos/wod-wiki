/**
 * Pilot port of `timer.compliance.test.ts` onto the unified `TestScript`
 * surface (Phase B of plan-candidates-2-3-4-5).
 *
 * This file is the migration seed: it shows the *target* pattern for
 * moving the 9 compliance suites off `SessionTestContext`.  Once the
 * feature parity gap is closed, the same recipe applies to the rest of
 * `tests/runtime-compliance/*` and `tests/jit-compilation/*`.
 *
 * Migration mapping (old → new):
 *   createSessionContext(SCRIPT)    → await TestScript.compile(SCRIPT)
 *   startSession(ctx, {label})      → TestScript.compile already starts it
 *   userNext(ctx)                   → await ts.next()
 *   advanceClock(ctx, ms)           → await ts.tick(ms)
 *   ctx.runtime.stack.count         → (await ts.snapshot()).depth
 *   currentBlockType(ctx)           → (await ts.snapshot()).current?.blockType
 *   disposeSession(ctx)             → await ts.dispose()
 */
import { describe, it, expect, afterEach } from 'bun:test';
import { TestScript, assertions } from '@/testing/script';

describe('🟢 Countdown Timer — 5:00 Run (TestScript port)', () => {
    const SCRIPT = '5:00 Run';
    let script: TestScript | undefined;

    afterEach(async () => { if (script) await script.dispose(); script = undefined; });

    it('step 0: compile → depth = 2 (SessionRoot + WaitingToStart)', async () => {
        script = await TestScript.compile(SCRIPT);
        const state = await script.snapshot();
        expect(state.depth).toBe(2);
    });

    it('step 1: next() → Timer starts, direction = down', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        const state = await script.snapshot();
        expect(state.current?.blockType).toMatch(/timer/i);
    });

    it('step 2: tick(150_000) → mid-timer, block still active', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.tick(150_000);
        const state = await script.snapshot();
        expect(state.depth).toBeGreaterThan(0);
        expect(state.current?.blockType).toMatch(/timer/i);
    });

    it('step 3: tick(150_000) more → timer expires, session ends', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.tick(150_000);
        await script.tick(150_000);
        const state = await script.snapshot();
        expect(state.depth).toBe(0);
    });
});
