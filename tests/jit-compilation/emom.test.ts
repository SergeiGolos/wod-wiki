/**
 * Phase 4: EMOM (Chelsea) — Output Statement Integration Tests
 *
 * Validates that an EMOM (Every Minute On the Minute) workout
 * produces the correct output statements.
 *
 * Workout: Chelsea-style — (3) :60 EMOM 5 Pullups
 * Pattern: SessionRoot > WaitingToStart > EMOM(3×:60) > [exercises]×3
 *
 * Using 3 rounds instead of 30 for practical test execution.
 *
 * Key differences: Interval timer per round (countdown :60), resets each round.
 * Bounded rounds (unlike AMRAP).
 *
 * @see docs/planning-output-statements/emom.md
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

describe('EMOM — Output Statements', () => {
    let ctx: SessionTestContext;

    afterEach(() => {
        if (ctx) disposeSession(ctx);
    });

    describe('3-round EMOM: (3) :60 EMOM 5 Pullups', () => {
        it('should start workout with correct initial stack', () => {
            ctx = createSessionContext('(3) :60 EMOM\n  5 Pullups');
            startSession(ctx, { label: 'EMOM Test' });

            // SessionRoot + WaitingToStart
            expect(ctx.runtime.stack.count).toBe(2);

            // User starts
            userNext(ctx);
            // WaitingToStart pops → EMOM pushed → first exercise pushed
            expect(ctx.runtime.stack.count).toBeGreaterThanOrEqual(2);
        });

        it('should complete after 3 rounds', () => {
            ctx = createSessionContext('(3) :60 EMOM\n  5 Pullups');
            startSession(ctx, { label: 'EMOM Test' });
            userNext(ctx); // Start

            // Each round: exercise is active, timer runs for 60s.
            // When interval expires, TimerCompletionBehavior clears children
            // (auto-pops exercise) and resets timer. RoundAdvanceBehavior advances
            // the round, ChildLoopBehavior resets, ChildRunnerBehavior pushes next.
            for (let round = 0; round < 3; round++) {
                advanceClock(ctx, 60000); // Interval expires → auto-advance
            }

            // After 3 rounds, RoundCompletionBehavior pops EMOM → session ends
            expect(ctx.runtime.stack.count).toBe(0);
        });

        it('should emit paired outputs through completion', () => {
            ctx = createSessionContext('(3) :60 EMOM\n  5 Pullups');
            startSession(ctx, { label: 'EMOM Test' });
            userNext(ctx); // Start

            for (let round = 0; round < 3; round++) {
                advanceClock(ctx, 60000); // Interval expires → auto-advance
            }

            const unpaired = ctx.tracer.assertPairedOutputs();
            expect(unpaired).toEqual([]);
        });
    });
});
