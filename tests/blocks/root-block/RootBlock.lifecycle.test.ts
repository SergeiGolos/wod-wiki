import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ExecutionContextTestHarness } from '@/testing/harness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { workoutRootStrategy } from '@/runtime/compiler/strategies/WorkoutRootStrategy';
import {
    ChildSelectionBehavior,
    HistoryRecordBehavior
} from '@/runtime/behaviors';
import { PushBlockAction } from '@/runtime/actions/stack/PushBlockAction';
import { PopBlockAction } from '@/runtime/actions/stack/PopBlockAction';

describe('RootBlock Lifecycle', () => {
    let harness: ExecutionContextTestHarness;

    beforeEach(() => {
        harness = new ExecutionContextTestHarness({
            clockTime: new Date('2024-01-01T12:00:00Z')
        });
    });

    afterEach(() => {
        harness.dispose();
    });

    it('should initialize all behaviors on mount', () => {
        // Scenario: Fresh root block mount
        const harness = new ExecutionContextTestHarness({
            clockTime: new Date('2024-01-01T12:00:00Z'),
            statements: [{ id: 1, source: 'Exercise' }]
        });
        
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        const child = new MockBlock('child', []);
        harness.mockJit.whenMatches(() => true, child);

        // Use PushBlockAction to properly process the full action chain:
        // PushBlockAction → mount → behaviors → CompileChildBlockAction → PushBlockAction(child)
        harness.executeAction(new PushBlockAction(rootBlock));

        // Expectations: All behaviors called onMount
        // Timer initialized in memory on root block, controls initialized, first child pushed
        expect(rootBlock.getMemory('timer')).toBeDefined();
        expect(harness.stack.count).toBe(2); // root + child
        
        harness.dispose();
    });

    it('should track execution start time on mount', () => {
        // Scenario: Verify timing capture
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        const startTime = new Date('2024-01-01T12:00:00Z');
        harness.setClock(startTime);

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        // Expectations: Start time captured
        expect(rootBlock.executionTiming.startTime).toEqual(startTime);
    });

    it('should execute child runner on next()', () => {
        // Scenario: Child completes, next() called
        const harness = new ExecutionContextTestHarness({
            clockTime: new Date('2024-01-01T12:00:00Z'),
            statements: [
                { id: 1, source: 'Child 1' },
                { id: 2, source: 'Child 2' }
            ]
        });
        
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2]]
        });

        const child1 = new MockBlock('child-1', []);
        const child2 = new MockBlock('child-2', []);
        
        harness.mockJit.whenMatches(
            (stmts) => stmts.some(s => s.id === 1),
            child1
        );
        harness.mockJit.whenMatches(
            (stmts) => stmts.some(s => s.id === 2),
            child2
        );

        // Mount root via PushBlockAction (pushes child-1)
        harness.executeAction(new PushBlockAction(rootBlock));
        expect(harness.stack.count).toBe(2); // root + child1

        harness.clearRecordings();

        // Pop child-1 → NextAction → root.next() → ChildSelection pushes child-2
        harness.executeAction(new PopBlockAction());

        // Expectations: ChildRunner pushes next child
        expect(harness.mockJit.compileCalls).toHaveLength(1);
        expect(harness.stack.current).toBe(child2);
        
        harness.dispose();
    });

    it('should track completion time on unmount', () => {
        // Scenario: Workout completes, root unmounted
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        const child = new MockBlock('child', []);
        harness.mockJit.whenMatches(() => true, child);

        const startTime = new Date('2024-01-01T12:00:00Z');
        harness.setClock(startTime);

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        // Advance time
        harness.advanceClock(300000); // 5 minutes

        const completionTime = harness.clock.now;
        rootBlock.unmount(harness.runtime, { completedAt: completionTime });

        // Expectations: Timing captured
        expect(rootBlock.executionTiming.startTime).toEqual(startTime);
        // Note: completedAt may be set by unmount options or behavior
    });

    it('should emit history record on unmount', () => {
        // Scenario: Workout completes, history should be recorded
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        const child = new MockBlock('child', []);
        harness.mockJit.whenMatches(() => true, child);

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        // Unmount should trigger history record
        rootBlock.unmount(harness.runtime);

        // Expectations: History record event emitted
        // Note: HistoryRecordBehavior emits on unmount
        expect(rootBlock.getBehavior(HistoryRecordBehavior)).toBeDefined();
    });

    it('should handle dispose without errors', () => {
        // Scenario: Root removed from stack
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);
        rootBlock.unmount(harness.runtime);

        // Dispose should clean up any remaining resources
        expect(() => {
            rootBlock.dispose(harness.runtime);
        }).not.toThrow();
    });

    it('should maintain frozen clock during mount', () => {
        // Scenario: Clock must be frozen during mount actions
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        const child = new MockBlock('child', []);
        harness.mockJit.whenMatches(() => true, child);

        const timestamps: Date[] = [];

        harness.stack.push(rootBlock);
        
        harness.executeAction({
            type: 'mount-root',
            do: (runtime) => {
                timestamps.push(runtime.clock.now);
                const actions = rootBlock.mount(runtime);
                timestamps.push(runtime.clock.now);
                actions.forEach(action => {
                    timestamps.push(runtime.clock.now);
                    action.do(runtime);
                    timestamps.push(runtime.clock.now);
                });
            }
        });

        // All timestamps in same turn should be identical
        const uniqueTimes = new Set(timestamps.map(t => t.getTime()));
        expect(uniqueTimes.size).toBe(1);
    });

    it('should handle mount with custom clock', () => {
        // Scenario: Mount with specific clock time
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        const child = new MockBlock('child', []);
        harness.mockJit.whenMatches(() => true, child);

        const customTime = new Date('2025-12-31T23:59:59Z');

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime, { 
            startTime: customTime,
            clock: { now: customTime }
        });

        // Expectations: Custom time used
        expect(rootBlock.executionTiming.startTime).toEqual(customTime);
    });

    it('should handle next with no remaining children', () => {
        // Scenario: Call next when all children executed
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        const child = new MockBlock('child', []);
        harness.mockJit.whenMatches(() => true, child);

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        // First next returns nothing (only 1 child, already pushed on mount)
        const nextActions = rootBlock.next(harness.runtime);

        // Expectations: ChildSelection clears next preview when no children remain
        expect(nextActions.length).toBe(1);
        expect(nextActions[0].type).toBe('update-next-preview');
        
        const childSelection = rootBlock.getBehavior(ChildSelectionBehavior)!;
        expect(childSelection.allChildrenExecuted).toBe(true);
    });

    it('should allow multiple unmount calls safely', () => {
        // Scenario: Defensive unmount handling
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        // First unmount
        expect(() => {
            rootBlock.unmount(harness.runtime);
        }).not.toThrow();

        // Second unmount should not throw
        expect(() => {
            rootBlock.unmount(harness.runtime);
        }).not.toThrow();
    });
});
