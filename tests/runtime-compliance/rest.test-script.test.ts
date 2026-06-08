/**
 * TestScript port of `rest.compliance.test.ts` (Phase B pilot #2).
 *
 * Demonstrates the migration pattern for rest/timer scenarios:
 *   createSessionContext(SCRIPT) → await TestScript.compile(SCRIPT)
 *   startSession(ctx, opts)     → TestScript.compile already starts
 *   userNext(ctx)                → await ts.next()
 *   advanceClock(ctx, ms)       → await ts.tick(ms)
 *   disposeSession(ctx)          → await ts.dispose()
 *   ctx.runtime.stack.current    → (await ts.snapshot()).current
 *   ctx.runtime.stack.count      → (await ts.snapshot()).depth
 *
 * The remaining scenarios in the original file use `ctx.tracer` and
 * `ctx.runtime.stack.blocks` — these access patterns are outside the
 * `TestScript` surface at the moment.  For a complete port we would
 * need to either extend `assertions.ts` with `outputs()` and
 * `systemPops()` accessors, or keep the tracer-based assertions in the
 * original file.
 *
 * The tests below cover the simple timer-expiry path.  For assertions
 * on output statements, see the original `rest.compliance.test.ts`.
 */
import { describe, it, expect, afterEach } from 'bun:test';
import { TestScript } from '@/testing/script';

describe('🟢 Timed Rest (standalone) — 1:00 Rest (TestScript port)', () => {
    const SCRIPT = '1:00 Rest';
    let script: TestScript | undefined;

    afterEach(async () => { if (script) await script.dispose(); script = undefined; });

    it('step 0: compile → depth = 2 (SessionRoot + WaitingToStart)', async () => {
        script = await TestScript.compile(SCRIPT);
        const state = await script.snapshot();
        expect(state.depth).toBe(2);
    });

    it('step 1: next() → Rest timer starts', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        const state = await script.snapshot();
        expect(state.current?.blockType).toMatch(/rest|timer/i);
    });

    it('step 2: tick(60_000) → rest auto-completes, session ends', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.tick(60_000);
        const state = await script.snapshot();
        expect(state.depth).toBe(0);
    });
});
