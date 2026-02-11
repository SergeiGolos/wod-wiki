/**
 * Phase 4: Loop with Rest (Barbara) — Output Statement Integration Tests
 *
 * Validates that a multi-round workout with an explicit rest period
 * produces the correct output statements.
 *
 * Workout: Barbara (simplified) — (3) 10 Pullups / 15 Pushups / 1:00 Rest
 * Pattern: SessionRoot > WaitingToStart > Loop(3) > [exercises + rest]×3
 *
 * Using 3 rounds instead of 5 and fewer exercises for practical testing.
 *
 * Key differences from fixed-round-loop: includes a Rest segment as an
 * explicit child in the loop, producing a timer countdown child.
 *
 * @see docs/planning-output-statements/loop-with-rest.md
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

describe('Loop-with-Rest — Output Statements', () => {
    let ctx: SessionTestContext;

    afterEach(() => {
        if (ctx) disposeSession(ctx);
    });

    describe('Barbara-style: (3) 10 Pullups / 15 Pushups / 1:00 Rest', () => {
        it('should start workout with correct initial stack', () => {
            ctx = createSessionContext('(3)\n  10 Pullups\n  15 Pushups\n  1:00 Rest');
            startSession(ctx, { label: 'Barbara Test' });

            // SessionRoot + WaitingToStart
            expect(ctx.runtime.stack.count).toBe(2);

            // User starts
            userNext(ctx);

            // WaitingToStart pops → loop pushed → first exercise pushed
            expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(2);
        });

        it('should complete after 3 rounds of 3 children each', () => {
            ctx = createSessionContext('(3)\n  10 Pullups\n  15 Pushups\n  1:00 Rest');
            startSession(ctx, { label: 'Barbara Test' });
            userNext(ctx); // Start

            // 3 rounds × 3 children (2 exercises + 1 rest) = 9 userNext calls
            for (let i = 0; i < 9; i++) {
                userNext(ctx);
                // For rest periods, advance clock
                if (i % 3 === 2) {
                    advanceClock(ctx, 60000);
                }
            }

            // Pop any remaining blocks
            let safety = 5;
            while (ctx.runtime.stack.count > 0 && safety > 0) {
                userNext(ctx);
                safety--;
            }

            expect(ctx.runtime.stack.count).toBe(0);
        });

        it('should emit paired outputs through completion', () => {
            ctx = createSessionContext('(3)\n  10 Pullups\n  15 Pushups\n  1:00 Rest');
            startSession(ctx, { label: 'Barbara Test' });
            userNext(ctx); // Start

            for (let i = 0; i < 9; i++) {
                userNext(ctx);
                if (i % 3 === 2) {
                    advanceClock(ctx, 60000);
                }
            }

            let safety = 5;
            while (ctx.runtime.stack.count > 0 && safety > 0) {
                userNext(ctx);
                safety--;
            }

            const unpaired = ctx.tracer.assertPairedOutputs();
            expect(unpaired).toEqual([]);
        });

        it('should emit at least 20 output statements', () => {
            ctx = createSessionContext('(3)\n  10 Pullups\n  15 Pushups\n  1:00 Rest');
            startSession(ctx, { label: 'Barbara Test' });
            userNext(ctx);

            for (let i = 0; i < 9; i++) {
                userNext(ctx);
                if (i % 3 === 2) {
                    advanceClock(ctx, 60000);
                }
            }

            let safety = 5;
            while (ctx.runtime.stack.count > 0 && safety > 0) {
                userNext(ctx);
                safety--;
            }

            // 3 rounds × 3 children × ~2 outputs each + session/loop outputs
            ctx.tracer.assertMinCount(20);
        });
    });
});
