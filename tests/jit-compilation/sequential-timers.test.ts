/**
 * Phase 4: Sequential Timers — Output Statement Integration Tests
 *
 * Validates that a flat sequence of independent timer/effort blocks
 * produces the correct output statements.
 *
 * Workouts: Simple & Sinister style (multiple timed segments)
 * Pattern: SessionRoot > WaitingToStart > Timer1 > Timer2 > ...
 *
 * @see docs/planning-output-statements/sequential-timers.md
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

describe('Sequential Timers — Output Statements', () => {
    let ctx: SessionTestContext;

    afterEach(() => {
        if (ctx) disposeSession(ctx);
    });

    describe('Two-segment workout: 5:00 Run / 1:00 Rest', () => {
        it('should produce correct lifecycle through full session', () => {
            ctx = createSessionContext('5:00 Run\n1:00 Rest');

            startSession(ctx, { label: 'Simple' });

            // SessionRoot + WaitingToStart on stack
            expect(ctx.runtime.stack.count).toBe(2);

            // User starts
            userNext(ctx);
            // WaitingToStart pops → first exercise pushed
            expect(ctx.runtime.stack.count).toBe(2); // SessionRoot + Timer(5:00 Run)

            // User advances past first segment
            userNext(ctx);
            // Timer(5:00) pops → Rest(1:00) pushed
            expect(ctx.runtime.stack.count).toBe(2); // SessionRoot + Rest(1:00)

            // User advances past rest
            userNext(ctx);
            // Rest pops → no more children → SessionRoot pops
            expect(ctx.runtime.stack.count).toBe(0);
        });

        it('should emit paired segment/completion outputs', () => {
            ctx = createSessionContext('5:00 Run\n1:00 Rest');
            startSession(ctx, { label: 'Simple' });
            userNext(ctx); // Start
            userNext(ctx); // Complete first
            userNext(ctx); // Complete rest

            const unpaired = ctx.tracer.assertPairedOutputs();
            expect(unpaired).toEqual([]);
        });

        it('should have at least 8 outputs (4 segments + 4 completions)', () => {
            ctx = createSessionContext('5:00 Run\n1:00 Rest');
            startSession(ctx, { label: 'Simple' });
            userNext(ctx);
            userNext(ctx);
            userNext(ctx);

            // root-segment, waiting-segment, waiting-completion,
            // timer1-segment, timer1-completion,
            // timer2-segment, timer2-completion,
            // root-completion
            ctx.tracer.assertMinCount(8);
        });
    });

    describe('Three-segment workout: Run / Rest / Turkish Getups', () => {
        it('should sequence three children correctly', () => {
            ctx = createSessionContext(
                '5:00 100 KB Swings 70lb\n1:00 Rest\n10:00 10 Turkish Getups 70lb'
            );
            startSession(ctx, { label: 'S&S' });

            expect(ctx.runtime.stack.count).toBe(2); // Root + WaitingToStart

            userNext(ctx); // Start → first exercise
            expect(ctx.runtime.stack.count).toBe(2);

            userNext(ctx); // Complete first → push rest
            expect(ctx.runtime.stack.count).toBe(2);

            userNext(ctx); // Complete rest → push TGU
            expect(ctx.runtime.stack.count).toBe(2);

            userNext(ctx); // Complete TGU → session ends
            expect(ctx.runtime.stack.count).toBe(0);

            const unpaired = ctx.tracer.assertPairedOutputs();
            expect(unpaired).toEqual([]);
        });

        it('should have at least 10 outputs for 3-child session', () => {
            ctx = createSessionContext(
                '5:00 100 KB Swings 70lb\n1:00 Rest\n10:00 10 Turkish Getups 70lb'
            );
            startSession(ctx, { label: 'S&S' });
            userNext(ctx); // Start
            userNext(ctx); // KB Swings done
            userNext(ctx); // Rest done
            userNext(ctx); // TGU done

            // root + waiting + 3 children × 2 + root completion = 10 minimum
            ctx.tracer.assertMinCount(10);
        });
    });
});
