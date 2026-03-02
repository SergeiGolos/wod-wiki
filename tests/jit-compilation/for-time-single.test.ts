/**
 * Phase 4: For Time (Single Exercise) — Output Statement Integration Tests
 *
 * Validates that the SessionRoot > WaitingToStart > Exercise lifecycle
 * produces the exact output statements documented in:
 *   docs/planning-output-statements/for-time-single.md
 *
 * Workouts: Grace (30 Clean & Jerk 135lb), Karen (150 Wall Ball Shots 20lb)
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

describe('For Time (Single Exercise) — Output Statements', () => {
    let ctx: SessionTestContext;

    afterEach(() => {
        if (ctx) disposeSession(ctx);
    });

    describe('Grace — 30 Clean & Jerk 135lb', () => {
        it('should produce correct output sequence through full lifecycle', () => {
            // Arrange: parse the Grace workout
            ctx = createSessionContext('30 Clean & Jerk 135lb');

            // Act: Start session (pushes SessionRoot → WaitingToStart)
            startSession(ctx, { label: 'Grace' });

            // Step 1: SessionRoot mounted → compiler/system outputs
            // Step 2: WaitingToStart mounted → compiler/system outputs
            expect(ctx.runtime.stack.count).toBe(2); // SessionRoot + WaitingToStart
            expect(ctx.tracer.outputs.length).toBeGreaterThanOrEqual(2);

            // Step 3: User clicks "Start" → WaitingToStart pops
            userNext(ctx);

            // Step 4: WaitingToStart unmounted → completion output
            // Step →5: SessionRoot.next() → ChildRunner pushes exercise
            // Step 6: Exercise mounted → system output
            expect(ctx.runtime.stack.count).toBe(2); // SessionRoot + Exercise
            expect(ctx.tracer.completions.length).toBeGreaterThanOrEqual(1); // WaitingToStart completion

            // Step 8: User completes exercise → exercise pops
            userNext(ctx);

            // Step 9: Exercise unmount → completion output
            // Step →11: SessionRoot.next() → no more children → markComplete → pop
            // Step 12: SessionRoot unmount → completion output
            expect(ctx.runtime.stack.count).toBe(0); // Session ended

            // Verify output sequence
            const outputs = ctx.tracer.outputs;

            // Check we got the right output types in order
            expect(outputs.length).toBeGreaterThanOrEqual(4);

            // Should have both segments and completions
            // Grace completion, WaitingToStart completion, SessionRoot completion
            expect(ctx.tracer.completions.length).toBeGreaterThanOrEqual(3); 

            // Session ends with stack empty
            expect(stackInfo(ctx).depth).toBe(0);
        });

        it('should emit paired segment/completion outputs', () => {
            ctx = createSessionContext('30 Clean & Jerk 135lb');
            startSession(ctx, { label: 'Grace' });
            userNext(ctx); // Start
            userNext(ctx); // Complete exercise

            const unpaired = ctx.tracer.assertPairedOutputs();
            expect(unpaired).toEqual([]);
        });

        it('should emit SessionRoot system output at stack level 1', () => {
            ctx = createSessionContext('30 Clean & Jerk 135lb');
            startSession(ctx, { label: 'Grace' });

            const rootPush = ctx.tracer.outputs.find(o => o.outputType === 'system' && o.sourceBlockKey === 'session-root');
            expect(rootPush).toBeDefined();
            expect(rootPush?.stackLevel).toBe(1);
        });

        it('should emit WaitingToStart system output at stack level 2', () => {
            ctx = createSessionContext('30 Clean & Jerk 135lb');
            startSession(ctx, { label: 'Grace' });

            // WaitingToStart is pushed after SessionRoot, at depth 2
            const waitingPush = ctx.tracer.outputs.find(
                o => o.outputType === 'system' && o.sourceBlockKey === 'waiting-to-start'
            );
            expect(waitingPush).toBeDefined();
            expect(waitingPush?.stackLevel).toBe(2);
        });

        it('should emit exercise system output after WaitingToStart is dismissed', () => {
            ctx = createSessionContext('30 Clean & Jerk 135lb');
            startSession(ctx, { label: 'Grace' });
            userNext(ctx); // Dismiss WaitingToStart

            // Exercise should now be pushed at depth 2 (SessionRoot still exists)
            const systemOutputs = ctx.tracer.outputs.filter(o => o.outputType === 'system');
            const exercisePush = systemOutputs.find(o => o.stackLevel === 2 && o.sourceBlockKey !== 'waiting-to-start');
            expect(exercisePush).toBeDefined();
        });

        it('should end session when exercise completes', () => {
            ctx = createSessionContext('30 Clean & Jerk 135lb');
            startSession(ctx, { label: 'Grace' });
            userNext(ctx); // Start
            userNext(ctx); // Complete exercise

            // Stack should be empty — session ended
            expect(ctx.runtime.stack.count).toBe(0);
        });
    });

    describe('Karen — 150 Wall Ball Shots 20lb', () => {
        it('should produce same lifecycle pattern as Grace', () => {
            ctx = createSessionContext('150 Wall Ball Shots 20lb');
            startSession(ctx, { label: 'Karen' });

            // SessionRoot + WaitingToStart on stack
            expect(ctx.runtime.stack.count).toBe(2);

            userNext(ctx); // Start
            expect(ctx.runtime.stack.count).toBe(2); // SessionRoot + Exercise

            userNext(ctx); // Complete exercise
            expect(ctx.runtime.stack.count).toBe(0); // Session ended

            // Verify paired outputs
            const unpaired = ctx.tracer.assertPairedOutputs();
            expect(unpaired).toEqual([]);
        });

        it('should have at least 6 outputs (3 segments + 3 completions)', () => {
            ctx = createSessionContext('150 Wall Ball Shots 20lb');
            startSession(ctx, { label: 'Karen' });
            userNext(ctx); // Start
            userNext(ctx); // Complete

            // Planning table shows ~10 outputs (including milestones)
            // Minimum: root-segment, waiting-segment, waiting-completion,
            //          exercise-segment, exercise-completion, root-completion
            ctx.tracer.assertMinCount(6);
        });
    });
});
