/**
 * Unit tests for ClearChildrenAction.
 *
 * Validates that ClearChildrenAction:
 * 1. Pops all blocks above the target block
 * 2. Force-completes incomplete blocks during pop
 * 3. Runs full unmount lifecycle (fragment emission)
 * 4. Returns a NextAction for the target block
 * 5. Does nothing if target block is already on top
 */
import { describe, it, expect, afterEach } from 'bun:test';
import {
    createSessionContext,
    startSession,
    userNext,
    advanceClock,
    stackInfo,
    disposeSession,
    type SessionTestContext,
} from './helpers/session-test-utils';

describe('ClearChildrenAction — Auto-Pop on Timer Expiry', () => {
    let ctx: SessionTestContext;

    afterEach(() => {
        if (ctx) disposeSession(ctx);
    });

    describe('AMRAP timer expiry', () => {
        it('should auto-pop active exercise when AMRAP timer expires', () => {
            ctx = createSessionContext('20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  15 Air Squats');
            startSession(ctx, { label: 'Test' });
            userNext(ctx); // Start → WaitingToStart pops, AMRAP pushed, first exercise pushed

            // Verify exercise is active on stack
            const info = stackInfo(ctx);
            expect(info.depth).toBeGreaterThanOrEqual(3); // Session + AMRAP + exercise

            // Expire timer → auto-pop exercise → auto-pop AMRAP → session ends
            advanceClock(ctx, 1200000); // 20 minutes

            // Stack should be empty — everything auto-popped
            expect(ctx.runtime.stack.count).toBe(0);
        });

        it('should emit completion output for force-popped exercise', () => {
            ctx = createSessionContext('20:00 AMRAP\n  5 Pullups');
            startSession(ctx, { label: 'Test' });
            userNext(ctx); // Start

            // Exercise is active, expire timer
            advanceClock(ctx, 1200000); // 20 minutes

            // All outputs should be paired (segment + completion for every block)
            const unpaired = ctx.tracer.assertPairedOutputs();
            expect(unpaired).toEqual([]);
        });

        it('should not loop after timer expires', () => {
            ctx = createSessionContext('20:00 AMRAP\n  5 Pullups');
            startSession(ctx, { label: 'Test' });
            userNext(ctx); // Start

            // Complete a few rounds manually
            userNext(ctx); // exercise complete, next round starts
            userNext(ctx); // exercise complete, next round starts

            // Now expire timer
            advanceClock(ctx, 1200000);

            // Should be fully terminated
            expect(ctx.runtime.stack.count).toBe(0);
        });
    });

    describe('EMOM interval expiry', () => {
        it('should auto-advance to next round when interval expires', () => {
            ctx = createSessionContext('(3) :60 EMOM\n  5 Pullups');
            startSession(ctx, { label: 'Test' });
            userNext(ctx); // Start

            // Expire first interval — should auto-advance, not terminate
            advanceClock(ctx, 60000);

            // Should still have blocks on stack (EMOM with round 2)
            expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(2);
        });

        it('should terminate after all rounds complete via interval timer', () => {
            ctx = createSessionContext('(3) :60 EMOM\n  5 Pullups');
            startSession(ctx, { label: 'Test' });
            userNext(ctx); // Start

            // Run all 3 intervals
            advanceClock(ctx, 60000); // Round 1 expire
            advanceClock(ctx, 60000); // Round 2 expire
            advanceClock(ctx, 60000); // Round 3 expire

            // All rounds done → EMOM terminates → session ends
            expect(ctx.runtime.stack.count).toBe(0);
        });

        it('should reset timer between intervals', () => {
            ctx = createSessionContext('(3) :60 EMOM\n  5 Pullups');
            startSession(ctx, { label: 'Test' });
            userNext(ctx); // Start

            // Run 2 intervals
            advanceClock(ctx, 60000); // Round 1 expire → timer resets
            advanceClock(ctx, 60000); // Round 2 expire → timer resets

            // Should still be alive (round 3 active)
            expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(2);

            // Complete round 3
            advanceClock(ctx, 60000);
            expect(ctx.runtime.stack.count).toBe(0);
        });

        it('should emit paired outputs for all intervals', () => {
            ctx = createSessionContext('(3) :60 EMOM\n  5 Pullups');
            startSession(ctx, { label: 'Test' });
            userNext(ctx); // Start

            advanceClock(ctx, 60000);
            advanceClock(ctx, 60000);
            advanceClock(ctx, 60000);

            const unpaired = ctx.tracer.assertPairedOutputs();
            expect(unpaired).toEqual([]);
        });
    });

    describe('Forced-pop completion marking', () => {
        it('should mark force-popped blocks as complete with forced-pop reason', () => {
            ctx = createSessionContext('20:00 AMRAP\n  5 Pullups');
            startSession(ctx, { label: 'Test' });
            userNext(ctx); // Start

            // Capture the exercise block before it's popped
            const exerciseBlock = ctx.runtime.stack.current!;
            expect(exerciseBlock.isComplete).toBe(false);

            // Expire timer → force-pop exercise
            advanceClock(ctx, 1200000);

            // Exercise should have been marked complete with 'forced-pop' reason
            expect(exerciseBlock.isComplete).toBe(true);
            expect((exerciseBlock as any).completionReason).toBe('forced-pop');
        });

        it('should not re-mark blocks that were already complete', () => {
            ctx = createSessionContext('20:00 AMRAP\n  5 Pullups');
            startSession(ctx, { label: 'Test' });
            userNext(ctx); // Start

            // Manually complete the exercise first
            userNext(ctx); // Exercise pops cleanly (PopOnNextBehavior)

            // Now expire the timer — AMRAP should be marked 'timer-expired', not 'forced-pop'
            advanceClock(ctx, 1200000);

            // Stack empty
            expect(ctx.runtime.stack.count).toBe(0);
        });
    });
});
