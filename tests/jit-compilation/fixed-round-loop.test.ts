/**
 * Phase 4: Fixed-Round Loop (Helen) — Output Statement Integration Tests
 *
 * Validates that a fixed-round loop with multiple exercises
 * produces the correct output statements.
 *
 * Workout: Helen — (3) 400m Run / 21 KB Swings 53lb / 12 Pullups
 * Pattern: SessionRoot > WaitingToStart > Loop(3) > [Run, KB Swings, Pullups]×3
 *
 * @see docs/planning-output-statements/fixed-round-loop.md
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

describe('Fixed-Round Loop (Helen) — Output Statements', () => {
    let ctx: SessionTestContext;

    afterEach(() => {
        if (ctx) disposeSession(ctx);
    });

    describe('Helen — (3) 400m Run / 21 KB Swings / 12 Pullups', () => {
        /**
         * Helper to advance through one complete round of Helen.
         * Each round has 3 exercises that need to be manually advanced.
         */
        function advanceOneRound() {
            userNext(ctx); // Exercise 1 (Run) complete
            userNext(ctx); // Exercise 2 (KB Swings) complete
            userNext(ctx); // Exercise 3 (Pullups) complete
        }

        it('should produce correct lifecycle through 3 rounds', () => {
            ctx = createSessionContext('(3)\n  400m Run\n  21 KB Swings 53lb\n  12 Pullups');
            startSession(ctx, { label: 'Helen' });

            // SessionRoot + WaitingToStart
            expect(ctx.runtime.stack.count).toBe(2);

            // User starts — WaitingToStart pops, Loop block pushed
            userNext(ctx);
            expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(2); // SessionRoot + Loop (+ possibly first exercise)

            // Advance through 3 rounds (3 exercises × 3 rounds = 9 userNext calls)
            for (let round = 0; round < 3; round++) {
                // At start of each round, we need to advance through 3 exercises
                advanceOneRound();
            }

            // After 3 rounds, loop should be complete → SessionRoot should pop
            expect(ctx.runtime.stack.count).toBe(0);
        });

        it('should emit paired segment/completion outputs across all rounds', () => {
            ctx = createSessionContext('(3)\n  400m Run\n  21 KB Swings 53lb\n  12 Pullups');
            startSession(ctx, { label: 'Helen' });
            userNext(ctx); // Start

            for (let round = 0; round < 3; round++) {
                advanceOneRound();
            }

            const unpaired = ctx.tracer.assertPairedOutputs();
            expect(unpaired).toEqual([]);
        });

        it('should have many outputs across 3 rounds', () => {
            ctx = createSessionContext('(3)\n  400m Run\n  21 KB Swings 53lb\n  12 Pullups');
            startSession(ctx, { label: 'Helen' });
            userNext(ctx); // Start

            for (let round = 0; round < 3; round++) {
                advanceOneRound();
            }

            // At minimum: root-segment + waiting pair + loop-segment/completion +
            // 3 rounds × 3 exercises × 2 (segment+completion) = ~24
            ctx.tracer.assertMinCount(20);
        });

        it('should end with stack empty', () => {
            ctx = createSessionContext('(3)\n  400m Run\n  21 KB Swings 53lb\n  12 Pullups');
            startSession(ctx, { label: 'Helen' });
            userNext(ctx); // Start

            for (let round = 0; round < 3; round++) {
                advanceOneRound();
            }

            expect(stackInfo(ctx).depth).toBe(0);
        });
    });
});
