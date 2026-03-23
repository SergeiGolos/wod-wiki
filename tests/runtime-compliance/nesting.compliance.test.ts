/**
 * Nesting & Sequential Scenario Compliance Tests
 *
 * Based on: docs/finishline/compliance-scenarios/nesting.md
 *
 * Covers nested and sequential workout block scenarios, step-by-step,
 * matching the spec tables.
 *
 * Legend:
 *   🟢 Expected to pass — behaviour is fully implemented
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEMOMRoundState(ctx: SessionTestContext): RoundState | undefined {
    const emomBlock = ctx.runtime.stack.blocks.find(b => b.blockType === 'EMOM');
    if (!emomBlock) return undefined;
    return emomBlock.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined;
}

function getForTimeRoundState(ctx: SessionTestContext): RoundState | undefined {
    const forTimeBlock = ctx.runtime.stack.blocks.find(b => b.blockType === 'Rounds');
    if (!forTimeBlock) return undefined;
    return forTimeBlock.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined;
}

// ===========================================================================
// 🟢 EMOM Containing Rounds
//
// (5) 1:00 EMOM
//   (3)
//     5 Pullups
//
// Spec: docs/finishline/compliance-scenarios/nesting.md#-emom-containing-rounds
// ===========================================================================
describe('🟢 EMOM Containing Rounds', () => {
    // Using 3 EMOM rounds instead of 5 for practical test execution.
    const SCRIPT = '(3) 1:00 EMOM\n  (3)\n    5 Pullups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 0: startSession → depth 2 (SessionRoot + WaitingToStart)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'EMOM Rounds' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: first userNext → EMOM + inner Rounds + Effort active', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'EMOM Rounds' });
        userNext(ctx); // WaitingToStart → EMOM → inner Rounds → first Pullup
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(3);
        expect(ctx.runtime.stack.current?.blockType).toMatch(/effort/i);
    });

    it('step 1: EMOM is on round 1 immediately after start', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'EMOM Rounds' });
        userNext(ctx);
        expect(getEMOMRoundState(ctx)?.current).toBe(1);
        expect(getEMOMRoundState(ctx)?.total).toBe(3);
    });

    it('3 pullups complete inner rounds, EMOM still on round 1 until timer fires', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'EMOM Rounds' });
        userNext(ctx); // start
        userNext(ctx); // pullup 1
        userNext(ctx); // pullup 2
        userNext(ctx); // pullup 3 → inner Rounds complete
        // EMOM round has NOT advanced yet — timer drives advancement
        expect(getEMOMRoundState(ctx)?.current).toBe(1);
    });

    it('timer expiry at 60s advances EMOM to round 2', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'EMOM Rounds' });
        userNext(ctx); // start
        userNext(ctx); // pullup 1
        userNext(ctx); // pullup 2
        userNext(ctx); // pullup 3 → inner Rounds complete
        advanceClock(ctx, 60000); // 60s interval expires
        expect(getEMOMRoundState(ctx)?.current).toBe(2);
    });

    it('timer expiry forces advancement even if inner rounds are not done', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'EMOM Rounds' });
        userNext(ctx); // start
        userNext(ctx); // pullup 1 only — inner rounds NOT complete
        advanceClock(ctx, 60000); // timer forces advancement anyway
        expect(getEMOMRoundState(ctx)?.current).toBe(2);
    });

    it('after timer expiry, fresh inner Rounds block is active (not a stale effort)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'EMOM Rounds' });
        userNext(ctx); // start
        userNext(ctx); // pullup 1
        advanceClock(ctx, 60000); // round 2 starts
        // The inner Rounds block should be on the stack again
        const hasRoundsBlock = ctx.runtime.stack.blocks.some(b => b.blockType === 'Rounds');
        expect(hasRoundsBlock).toBe(true);
    });

    it('3 complete EMOM rounds (9 pullups + 3 timer ticks) → session ends', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'EMOM Rounds' });
        userNext(ctx); // start
        for (let i = 0; i < 3; i++) {
            userNext(ctx); // pullup 1
            userNext(ctx); // pullup 2
            userNext(ctx); // pullup 3 → inner Rounds complete
            advanceClock(ctx, 60000); // timer advances EMOM round
        }
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('3 EMOM rounds forced by timer only (no inner round completion) → session ends', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'EMOM Rounds' });
        userNext(ctx); // start
        advanceClock(ctx, 60000); // round 1 → 2
        advanceClock(ctx, 60000); // round 2 → 3
        advanceClock(ctx, 60000); // round 3 → done
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('all outputs are paired (segment + completion for every block)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'EMOM Rounds' });
        userNext(ctx);
        advanceClock(ctx, 60000);
        advanceClock(ctx, 60000);
        advanceClock(ctx, 60000);
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});

// ===========================================================================
// 🟢 AMRAP Inside For Time
//
// 21-15-9 For Time
//   3:00 AMRAP
//     10 Pushups
//
// Spec: docs/finishline/compliance-scenarios/nesting.md#-amrap-inside-for-time
// ===========================================================================
describe('🟢 AMRAP Inside For Time', () => {
    const SCRIPT = '21-15-9 For Time\n  3:00 AMRAP\n    10 Pushups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 0: startSession → depth 2 (SessionRoot + WaitingToStart)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForTime AMRAP' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: first userNext → For Time + AMRAP + Effort active (3-level nest)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForTime AMRAP' });
        userNext(ctx); // WaitingToStart → Rounds → AMRAP → Pushups
        expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(3);
        expect(ctx.runtime.stack.current?.blockType).toMatch(/effort/i);
    });

    it('step 1: For Time is on round 1 of 3', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForTime AMRAP' });
        userNext(ctx);
        expect(getForTimeRoundState(ctx)?.current).toBe(1);
        expect(getForTimeRoundState(ctx)?.total).toBe(3);
    });

    it('step 1: AMRAP block is active on the stack', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForTime AMRAP' });
        userNext(ctx);
        expect(ctx.runtime.stack.blocks.some(b => b.blockType === 'AMRAP')).toBe(true);
    });

    it('3:00 AMRAP expires → For Time advances to round 2, fresh AMRAP starts', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForTime AMRAP' });
        userNext(ctx);
        advanceClock(ctx, 180000); // 3:00 AMRAP round 1 expires
        expect(getForTimeRoundState(ctx)?.current).toBe(2);
        expect(ctx.runtime.stack.blocks.some(b => b.blockType === 'AMRAP')).toBe(true);
    });

    it('all 3 AMRAP cycles complete → session ends', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForTime AMRAP' });
        userNext(ctx);
        advanceClock(ctx, 180000); // round 1 AMRAP expires
        advanceClock(ctx, 180000); // round 2 AMRAP expires
        advanceClock(ctx, 180000); // round 3 AMRAP expires
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('multiple userNexts within an AMRAP cycle do not complete the For Time early', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForTime AMRAP' });
        userNext(ctx); // start
        // Multiple Pushup completions within the AMRAP (AMRAP cycles internally)
        userNext(ctx); // Pushups round 2
        userNext(ctx); // Pushups round 3
        // For Time should still be on round 1
        expect(getForTimeRoundState(ctx)?.current).toBe(1);
        expect(ctx.runtime.stack.blocks.some(b => b.blockType === 'AMRAP')).toBe(true);
    });

    it('all outputs are paired after full 3-round completion', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'ForTime AMRAP' });
        userNext(ctx);
        advanceClock(ctx, 180000);
        advanceClock(ctx, 180000);
        advanceClock(ctx, 180000);
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});

// ===========================================================================
// 🟢 Back-to-Back AMRAPs
//
// 10:00 AMRAP
//   5 Pullups
//   10 Pushups
// 5:00 AMRAP
//   3 Thrusters
//
// Spec: docs/finishline/compliance-scenarios/nesting.md#-back-to-back-amraps
// ===========================================================================
describe('🟢 Back-to-Back AMRAPs', () => {
    const SCRIPT = '10:00 AMRAP\n  5 Pullups\n  10 Pushups\n5:00 AMRAP\n  3 Thrusters';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('step 0: startSession → depth 2 (SessionRoot + WaitingToStart)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'BackToBack' });
        expect(ctx.runtime.stack.count).toBe(2);
    });

    it('step 1: first userNext → 10:00 AMRAP + first child active', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'BackToBack' });
        userNext(ctx);
        expect(ctx.runtime.stack.blocks.some(b => b.blockType === 'AMRAP')).toBe(true);
        expect(ctx.runtime.stack.current?.blockType).toMatch(/effort/i);
    });

    it('10:00 AMRAP expires → second AMRAP auto-starts (no userNext needed)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'BackToBack' });
        userNext(ctx);
        advanceClock(ctx, 600000); // 10:00 expires
        // Second AMRAP should have auto-started
        const amrapBlock = ctx.runtime.stack.blocks.find(b => b.blockType === 'AMRAP');
        expect(amrapBlock).toBeDefined();
        expect(amrapBlock?.label).toContain('5:00');
    });

    it('after first AMRAP expires, second AMRAP\'s first child is active', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'BackToBack' });
        userNext(ctx);
        advanceClock(ctx, 600000);
        expect(ctx.runtime.stack.current?.blockType).toMatch(/effort/i);
    });

    it('5:00 AMRAP expires → session ends (no userNext required)', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'BackToBack' });
        userNext(ctx);
        advanceClock(ctx, 600000); // first AMRAP
        advanceClock(ctx, 300000); // second AMRAP
        expect(ctx.runtime.stack.count).toBe(0);
    });

    it('userNexts within first AMRAP cycle the child exercises', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'BackToBack' });
        userNext(ctx); // start → Pullups
        expect(ctx.runtime.stack.current?.label).toContain('Pullups');
        userNext(ctx); // Pullups → Pushups
        expect(ctx.runtime.stack.current?.label).toContain('Pushups');
        userNext(ctx); // Pushups → Pullups (AMRAP loops)
        expect(ctx.runtime.stack.current?.label).toContain('Pullups');
    });

    it('all outputs are paired after both AMRAPs complete', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'BackToBack' });
        userNext(ctx);
        advanceClock(ctx, 600000);
        advanceClock(ctx, 300000);
        const unpaired = ctx.tracer.assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});
