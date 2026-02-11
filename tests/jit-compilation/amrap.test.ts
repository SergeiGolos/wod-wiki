/**
 * Phase 4: AMRAP (Cindy) — Output Statement Integration Tests
 *
 * Validates that an AMRAP (As Many Rounds As Possible) workout
 * produces the correct output statements.
 *
 * Workout: Cindy — 20:00 AMRAP: 5 Pullups / 10 Pushups / 15 Air Squats
 * Pattern: SessionRoot > WaitingToStart > AMRAP(20:00) > [exercises]×N
 *
 * Key difference: Timer-terminated unbounded loop. Loop runs until
 * countdown timer expires. Round count is unbounded.
 *
 * @see docs/planning-output-statements/amrap.md
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

describe('AMRAP (Cindy) — Output Statements', () => {
    let ctx: SessionTestContext;

    afterEach(() => {
        if (ctx) disposeSession(ctx);
    });

    describe('Cindy — 20:00 AMRAP 5 Pullups / 10 Pushups / 15 Air Squats', () => {
        /**
         * Advance through one complete round (3 exercises).
         */
        function advanceOneRound() {
            userNext(ctx); // Pullups complete
            userNext(ctx); // Pushups complete
            userNext(ctx); // Air Squats complete
        }

        it('should start workout with correct stack depth', () => {
            ctx = createSessionContext('20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  15 Air Squats');
            startSession(ctx, { label: 'Cindy' });

            // SessionRoot + WaitingToStart
            expect(ctx.runtime.stack.count).toBe(2);

            // User starts
            userNext(ctx);
            // WaitingToStart pops → AMRAP pushed → first exercise pushed
            expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(2);
        });

        it('should allow completing one full round', () => {
            ctx = createSessionContext('20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  15 Air Squats');
            startSession(ctx, { label: 'Cindy' });
            userNext(ctx); // Start

            // Complete one round without time expiry
            advanceClock(ctx, 60000); // 1 minute elapsed
            advanceOneRound();

            // Should still be in the AMRAP (timer hasn't expired)
            // Stack should have SessionRoot + AMRAP + exercise
            expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(2);
        });

        it('should terminate when timer expires during a round', () => {
            ctx = createSessionContext('20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  15 Air Squats');
            startSession(ctx, { label: 'Cindy' });
            userNext(ctx); // Start

            // Complete 2 rounds (6 minutes simulated)
            advanceClock(ctx, 180000); // 3 min
            advanceOneRound();
            advanceClock(ctx, 180000); // 6 min total
            advanceOneRound();

            // Now expire the timer (advance to 20+ minutes)
            advanceClock(ctx, 840000); // 20 min total

            // Timer should be marked complete. Try advancing through remaining exercises.
            // The AMRAP should not loop again after timer expires.
            advanceOneRound();

            // After the last round completes with timer expired,
            // the AMRAP loop should stop (ChildLoop won't reset).
            // We may need one more userNext to pop the AMRAP itself.
            // The exact behavior depends on whether AMRAP auto-pops.
            // At minimum, the session should eventually end.

            // Pop any remaining blocks
            let safety = 5;
            while (ctx.runtime.stack.count > 0 && safety > 0) {
                userNext(ctx);
                safety--;
            }

            // Session should end eventually
            expect(ctx.runtime.stack.count).toBe(0);
        });

        it('should emit paired outputs through completion', () => {
            ctx = createSessionContext('20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  15 Air Squats');
            startSession(ctx, { label: 'Cindy' });
            userNext(ctx); // Start

            // Do one round, expire timer, finish
            advanceClock(ctx, 1200000); // 20 min (timer expires)
            advanceOneRound();

            let safety = 5;
            while (ctx.runtime.stack.count > 0 && safety > 0) {
                userNext(ctx);
                safety--;
            }

            const unpaired = ctx.tracer.assertPairedOutputs();
            expect(unpaired).toEqual([]);
        });
    });
});
