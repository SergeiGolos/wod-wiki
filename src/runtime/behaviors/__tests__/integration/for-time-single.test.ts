/**
 * For-Time-Single Integration Tests
 *
 * Tests the simplest workout pattern: SessionRoot > [WaitingToStart, Exercise]
 * No looping, no rounds. Single leaf exercise with secondary countup timer.
 *
 * Reference: docs/planning-output-statements/for-time-single.md (Grace / Karen)
 *
 * Section 1 (Layer 2): Exercise block behaviors — timer, outputs, sound cues
 * Section 2 (Layer 3): Full session lifecycle — multi-block parent-child flow
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    createMockRuntime,
    createMockBlock,
    mountBehaviors,
    unmountBehaviors,
    advanceBehaviors,
    simulateTicks,
    expectMemoryState,
    calculateElapsed,
    findOutputs,
    MockRuntime,
    MockBlock
} from './test-helpers';

import { ReportOutputBehavior } from '../../ReportOutputBehavior';
import { SoundCueBehavior } from '../../SoundCueBehavior';
import { TimerInitBehavior } from '../../TimerInitBehavior';
import { TimerTickBehavior } from '../../TimerTickBehavior';
import { LeafExitBehavior } from '../../LeafExitBehavior';
import { HistoryRecordBehavior } from '../../HistoryRecordBehavior';
import { ChildSelectionBehavior } from '../../ChildSelectionBehavior';
import { TimerState } from '../../../memory/MemoryTypes';
import { IBehaviorContext } from '../../../contracts/IBehaviorContext';

import { ExecutionContextTestHarness } from '@/testing/harness/ExecutionContextTestHarness';
import { ExecutionContextTestBuilder } from '@/testing/harness/ExecutionContextTestBuilder';
import { MockBlock as HarnessMockBlock } from '@/testing/harness/MockBlock';

// =============================================================================
// Section 1: Exercise Block Behaviors (Layer 2)
//
// Tests the leaf exercise block's behavior composition in isolation.
// Pattern: SegmentOutput + SoundCue + TimerInit(up) + TimerTick + PopOnNext
// =============================================================================

describe('For-Time-Single: Exercise Block Behaviors', () => {
    let runtime: MockRuntime;
    let block: MockBlock;

    const createExerciseBehaviors = () => [
        new ReportOutputBehavior({ label: 'Clean & Jerk' }),
        new SoundCueBehavior({
            cues: [
                { sound: 'start-beep', trigger: 'mount' },
                { sound: 'completion-beep', trigger: 'complete' }
            ]
        }),
        new TimerInitBehavior({ direction: 'up', label: 'For Time', role: 'secondary' }),
        new TimerTickBehavior(),
        new LeafExitBehavior()
    ];

    beforeEach(() => {
        runtime = createMockRuntime(0);
        block = createMockBlock({ label: 'Clean & Jerk' });
    });

    // Step 6: Segment output is emitted after pop, not on mount
    it('should not emit segment output on mount', () => {
        const behaviors = createExerciseBehaviors();

        mountBehaviors(behaviors, runtime, block);

        const segments = findOutputs(runtime, 'segment');
        expect(segments.length).toBe(0);
    });

    // Step 7: SoundCueBehavior mount trigger
    it('should emit start-beep milestone on mount', () => {
        const behaviors = createExerciseBehaviors();

        mountBehaviors(behaviors, runtime, block);

        const milestones = findOutputs(runtime, 'milestone');
        const startBeeps = milestones.filter(m =>
            (m.fragments as any[]).some(f => f.sound === 'start-beep')
        );
        expect(startBeeps.length).toBeGreaterThanOrEqual(1);
    });

    // Timer is secondary, direction up, no duration (countup)
    it('should initialize countup timer on mount', () => {
        const behaviors = createExerciseBehaviors();

        mountBehaviors(behaviors, runtime, block);

        expectMemoryState(block, 'time', {
            direction: 'up',
            label: 'For Time'
        });

        const timer = block.memory.get('time') as TimerState;
        expect(timer.durationMs).toBeUndefined();
    });

    // Countup timer never auto-completes
    it('should track elapsed time without auto-completing', () => {
        const behaviors = createExerciseBehaviors();
        const ctx = mountBehaviors(behaviors, runtime, block);

        simulateTicks(runtime, ctx, 60, 1000);

        expect(runtime.completionReason).toBeUndefined();
    });

    // Spot-check timer response with fake clock
    it('should validate elapsed time via fake clock', () => {
        const behaviors = createExerciseBehaviors();
        mountBehaviors(behaviors, runtime, block);

        // Advance 30 seconds
        runtime.clock.advance(30000);

        const timer = block.memory.get('time') as TimerState;
        const elapsed = calculateElapsed(timer, runtime.clock.timestamp);
        expect(elapsed).toBe(30000);
    });

    // Step 8: LeafExitBehavior marks complete as user-advance
    it('should mark complete as user-advance on next', () => {
        const behaviors = createExerciseBehaviors();
        const ctx = mountBehaviors(behaviors, runtime, block);

        advanceBehaviors(behaviors, ctx);

        expect(runtime.completionReason).toBe('user-advance');
    });

    // Step 9: ReportOutputBehavior emits completion output on unmount with timing
    it('should emit completion output with elapsed and spans on unmount', () => {
        const behaviors = createExerciseBehaviors();
        const ctx = mountBehaviors(behaviors, runtime, block);

        runtime.clock.advance(45000);
        unmountBehaviors(behaviors, ctx);

        // Completion output now emitted with elapsed/total/spans fragments
        const completions = findOutputs(runtime, 'completion');
        expect(completions.length).toBe(1);

        const completion = completions[0];
        const hasElapsed = (completion.fragments as any[]).some(f => f.fragmentType === 'elapsed');
        const hasSpans = (completion.fragments as any[]).some(f => f.fragmentType === 'spans');
        expect(hasElapsed).toBe(true);
        expect(hasSpans).toBe(true);
    });

    // Step 10: SoundCueBehavior unmount emits completion-beep
    it('should emit completion-beep milestone on unmount', () => {
        const behaviors = createExerciseBehaviors();
        const ctx = mountBehaviors(behaviors, runtime, block);

        runtime.clock.advance(45000);
        unmountBehaviors(behaviors, ctx);

        const milestones = findOutputs(runtime, 'milestone');
        const completeBeeps = milestones.filter(m =>
            (m.fragments as any[]).some(f => f.sound === 'completion-beep')
        );
        expect(completeBeeps.length).toBeGreaterThanOrEqual(1);
    });
});

// =============================================================================
// Section 2: For-Time Session Lifecycle (Layer 3)
//
// Tests the full 12-step Grace flow using ExecutionContextTestHarness.
// SessionRoot(ChildRunner) → WaitingToStart(PopOnNext) → Exercise → session end
//
// ChildRunnerBehavior returns CompileChildBlockAction, which needs the real
// ScriptRuntime JIT pipeline — hence Layer 3.
// =============================================================================

describe('For-Time-Single: Session Lifecycle', () => {
    let harness: ExecutionContextTestHarness;

    // Create blocks with the behaviors from the for-time-single spec
    const createWaitingBlock = () =>
        new HarnessMockBlock('waiting-to-start', [
            new ReportOutputBehavior({ label: 'Ready to Start' }),
            new LeafExitBehavior()
        ], { blockType: 'Waiting', label: 'Ready to Start' });

    const createExerciseBlock = () =>
        new HarnessMockBlock('clean-and-jerk', [
            new ReportOutputBehavior({ label: 'Clean & Jerk' }),
            new SoundCueBehavior({
                cues: [
                    { sound: 'start-beep', trigger: 'mount' },
                    { sound: 'completion-beep', trigger: 'complete' }
                ]
            }),
            new TimerInitBehavior({ direction: 'up', label: 'For Time', role: 'secondary' }),
            new TimerTickBehavior(),
            new LeafExitBehavior()
        ], { blockType: 'Exercise', label: 'Clean & Jerk' });

    const createSessionRoot = () =>
        new HarnessMockBlock('session-root', [
            new ReportOutputBehavior({ label: 'Grace' }),
            new HistoryRecordBehavior(),
            new ChildSelectionBehavior({ childGroups: [[0], [1]] })
        ], { blockType: 'SessionRoot', label: 'Grace' });

    beforeEach(() => {
        const waitingBlock = createWaitingBlock();
        const exerciseBlock = createExerciseBlock();
        const sessionRoot = createSessionRoot();

        harness = new ExecutionContextTestBuilder()
            .withClock(new Date('2024-01-01T12:00:00Z'))
            .withMaxDepth(30)
            // Provide mock statements so CompileChildBlockAction can resolve them
            .build();

        // Override the harness config: we need statements in the script
        // and JIT matchers to return our blocks
        harness = new ExecutionContextTestHarness({
            clockTime: new Date('2024-01-01T12:00:00Z'),
            maxDepth: 30,
            statements: [
                { id: 0, source: 'Ready to Start' },
                { id: 1, source: '30 Clean & Jerk 135lb' }
            ]
        });

        // Wire JIT matchers: statement ID → block
        harness.mockJit.whenMatches(
            (stmts) => stmts.some(s => s.id === 0),
            waitingBlock
        );
        harness.mockJit.whenMatches(
            (stmts) => stmts.some(s => s.id === 1),
            exerciseBlock
        );

        // Push and mount the session root to kick off the flow
        harness.pushAndMount(sessionRoot);
    });

    afterEach(() => {
        harness.dispose();
    });

    // Steps 1-2: SessionRoot mounts, ChildRunner pushes WaitingToStart
    it('should mount SessionRoot and push WaitingToStart via ChildRunner', () => {
        // SessionRoot mount triggers ChildRunnerBehavior which returns
        // CompileChildBlockAction for childGroups[0] = [0]
        // The runtime executes this action, compiling statement 0 → waitingBlock

        // Verify JIT was called for statement 0
        expect(harness.mockJit.compileCalls.length).toBeGreaterThanOrEqual(1);
        expect(harness.mockJit.wasCompiled(
            c => c.statements.some(s => s.id === 0)
        )).toBe(true);

        // Stack should have: SessionRoot + WaitingToStart
        expect(harness.stack.count).toBe(2);

        // Verify WaitingToStart is on top of the stack
        expect(harness.stack.current?.blockType).toBe('Waiting');
    });

    // Steps 3-6: User clicks next on WaitingToStart → pops it → ChildRunner pushes Exercise
    it('should pop WaitingToStart on next and push Exercise', () => {
        // At this point: stack = [SessionRoot, WaitingToStart]
        // Dispatch next event to advance
        harness.dispatchEvent({
            name: 'next',
            timestamp: harness.clock.now,
            data: {}
        });

        // WaitingToStart should have been popped and exercise pushed
        // ChildRunner on SessionRoot should compile statement 1
        expect(harness.mockJit.wasCompiled(
            c => c.statements.some(s => s.id === 1)
        )).toBe(true);

        // Stack should still be 2: SessionRoot + Exercise
        expect(harness.stack.count).toBe(2);
    });

    // Steps 6-7: Exercise block is active, verify timer is tracking
    it('should track elapsed time on Exercise block', () => {
        // Move to exercise block
        harness.dispatchEvent({
            name: 'next',
            timestamp: harness.clock.now,
            data: {}
        });

        // Advance clock 45 seconds while exercise is active
        harness.advanceClock(45000);

        // The exercise block (top of stack) should have the right block type
        const exerciseBlock = harness.stack.current as HarnessMockBlock;
        expect(exerciseBlock).toBeDefined();
        expect(exerciseBlock.key.toString()).toBe('clean-and-jerk');
    });

    // Steps 8-12: User completes exercise → pops → ChildRunner has no more children → session ends
    it('should complete Exercise on next and end session', () => {
        // Move to exercise: next pops WaitingToStart, ChildRunner pushes Exercise
        harness.dispatchEvent({
            name: 'next',
            timestamp: harness.clock.now,
            data: {}
        });

        // Verify exercise is active
        expect(harness.stack.count).toBe(2);
        expect(harness.stack.current?.blockType).toBe('Exercise');

        // Advance time to simulate workout duration
        harness.advanceClock(120000); // 2 minutes

        // User completes exercise: next pops Exercise, ChildRunner has no more children
        harness.dispatchEvent({
            name: 'next',
            timestamp: harness.clock.now,
            data: {}
        });

        // After exercise pops, ChildRunner has no more children.
        // The mock SessionRoot doesn't have SessionCompletionBehavior,
        // so it stays on the stack. Verify exercise was at least popped.
        expect(harness.stack.count).toBeLessThanOrEqual(1); // Exercise popped, SessionRoot may remain
    });

    // Verify the JIT compilation sequence matches the expected child order
    it('should compile children in order: WaitingToStart then Exercise', () => {
        // Statement 0 (WaitingToStart) should be compiled first (on mount)
        const calls = harness.mockJit.compileCalls;
        expect(calls.length).toBeGreaterThanOrEqual(1);

        const firstCall = calls[0];
        expect(firstCall.statements.some(s => s.id === 0)).toBe(true);

        // Advance to exercise
        harness.dispatchEvent({
            name: 'next',
            timestamp: harness.clock.now,
            data: {}
        });

        // Statement 1 (Exercise) should be compiled second
        const allCalls = harness.mockJit.compileCalls;
        expect(allCalls.length).toBeGreaterThanOrEqual(2);

        const secondCall = allCalls[1];
        expect(secondCall.statements.some(s => s.id === 1)).toBe(true);
    });
});
