/**
 * Phase 4: For Time Rep-Scheme (Fran) — Output Statement Integration Tests
 *
 * Validates that a rep-scheme loop (21-15-9) with multiple exercises
 * produces the correct output statements.
 *
 * Workout: Fran — (21-15-9) Thrusters 95lb / Pullups
 * Pattern: SessionRoot > WaitingToStart > Loop(21-15-9) > [Thrusters, Pullups]×3
 *
 * Key difference from fixed-round: rep count changes per round via repScheme fragment.
 *
 * @see docs/planning-output-statements/for-time-rep-scheme.md
 */
import { describe, it, expect, afterEach } from 'bun:test';
import {
    createSessionContext,
    startSession,
    userNext,
    stackInfo,
    disposeSession,
    type SessionTestContext,
} from './helpers/session-test-utils';

describe('For Time Rep-Scheme (Fran) — Output Statements', () => {
    let ctx: SessionTestContext;

    afterEach(() => {
        if (ctx) disposeSession(ctx);
    });

    describe('Fran — (21-15-9) Thrusters 95lb / Pullups', () => {
        /**
         * Advance through one complete round (2 exercises).
         */
        function advanceOneRound() {
            userNext(ctx); // Thrusters complete
            userNext(ctx); // Pullups complete
        }

        it('should produce correct lifecycle through 3 rep-scheme rounds', () => {
            ctx = createSessionContext('(21-15-9)\n  Thrusters 95lb\n  Pullups');
            startSession(ctx, { label: 'Fran' });

            // SessionRoot + WaitingToStart
            expect(ctx.runtime.stack.count).toBe(2);

            // User starts
            userNext(ctx);
            expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(2);

            // 3 rounds × 2 exercises = 6 next calls
            for (let round = 0; round < 3; round++) {
                advanceOneRound();
            }

            // Session should be complete
            expect(ctx.runtime.stack.count).toBe(0);
        });

        it('should emit paired segment/completion outputs', () => {
            ctx = createSessionContext('(21-15-9)\n  Thrusters 95lb\n  Pullups');
            startSession(ctx, { label: 'Fran' });
            userNext(ctx); // Start

            for (let round = 0; round < 3; round++) {
                advanceOneRound();
            }

            const unpaired = ctx.tracer.assertPairedOutputs();
            expect(unpaired).toEqual([]);
        });

        it('should have outputs for all 3 rounds', () => {
            ctx = createSessionContext('(21-15-9)\n  Thrusters 95lb\n  Pullups');
            startSession(ctx, { label: 'Fran' });
            userNext(ctx); // Start

            for (let round = 0; round < 3; round++) {
                advanceOneRound();
            }

            // root-segment + waiting pair + loop + 3×(2 exercises×2) = ~18 minimum
            ctx.tracer.assertMinCount(16);
        });
    });
});
