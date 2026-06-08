/**
 * TestScript port of `for-time.compliance.test.ts` (Phase B pilot #3).
 *
 * Tests that don't require the OutputTracingHarness can be ported
 * directly.  The "completion reason" and "output pairing" assertions
 * need either tracer support in TestScript or stay on the
 * SessionTestContext harness.
 *
 * Pattern:
 *   createSessionContext(SCRIPT) → await TestScript.compile(SCRIPT)
 *   startSession(ctx, opts)     → handled by compile()
 *   userNext(ctx)                → await ts.next()
 *   ctx.runtime.stack.count     → (await ts.snapshot()).depth
 *   currentBlockType(ctx)        → (await ts.snapshot()).current?.blockType
 */
import { describe, it, expect, afterEach } from 'bun:test';
import { TestScript } from '@/testing/script';

describe('🟢 Single Movement (30 Clean & Jerk 135lb) — TestScript port', () => {
    const SCRIPT = '30 Clean & Jerk 135lb';
    let script: TestScript | undefined;

    afterEach(async () => { if (script) await script.dispose(); script = undefined; });

    it('step 0: compile → depth = 2 (SessionRoot + WaitingToStart)', async () => {
        script = await TestScript.compile(SCRIPT);
        const state = await script.snapshot();
        expect(state.depth).toBe(2);
    });

    it('step 1: next() → effort block mounted', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        const state = await script.snapshot();
        expect(state.current?.blockType).toMatch(/effort/i);
    });

    it('step 1: effort is at depth ≥ 2', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        const state = await script.snapshot();
        expect(state.depth).toBeGreaterThanOrEqual(2);
    });

    it('step 2: second next() → effort pops, session ends (depth = 0)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.next();
        const state = await script.snapshot();
        expect(state.depth).toBe(0);
    });
});
