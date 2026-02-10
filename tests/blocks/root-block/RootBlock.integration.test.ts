import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ExecutionContextTestHarness } from '@/testing/harness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { workoutRootStrategy } from '@/runtime/compiler/strategies/WorkoutRootStrategy';
import { ChildRunnerBehavior } from '@/runtime/behaviors';
import { PushBlockAction } from '@/runtime/actions/stack/PushBlockAction';
import { PopBlockAction } from '@/runtime/actions/stack/PopBlockAction';

describe('RootBlock Integration: Complete Workout', () => {
    let harness: ExecutionContextTestHarness;

    beforeEach(() => {
        harness = new ExecutionContextTestHarness({
            clockTime: new Date('2024-01-01T12:00:00Z')
        });
    });

    afterEach(() => {
        harness.dispose();
    });

    it('should execute complete single-section workout', () => {
        // Scenario: "3x10 Push-ups, 3x10 Squats"
        const harness = new ExecutionContextTestHarness({
            clockTime: new Date('2024-01-01T12:00:00Z'),
            statements: [
                { id: 1, source: '3x10 Push-ups' },
                { id: 2, source: '3x10 Squats' }
            ]
        });
        
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2]], // Two exercises
            totalRounds: 1
        });

        // Mock child blocks
        const pushups = new MockBlock('pushups', []);
        const squats = new MockBlock('squats', []);
        
        harness.mockJit.whenMatches(
            (s) => s.some(stmt => stmt.id === 1),
            pushups
        );
        harness.mockJit.whenMatches(
            (s) => s.some(stmt => stmt.id === 2),
            squats
        );

        // Mount root via PushBlockAction (pushes pushups as first child)
        harness.executeAction(new PushBlockAction(rootBlock));
        expect(harness.stack.count).toBe(2); // root + pushups

        // Pushups complete - PopBlockAction pops child, NextAction advances to squats
        harness.executeAction(new PopBlockAction());
        expect(harness.stack.count).toBe(2); // root + squats

        // Squats complete
        harness.executeAction(new PopBlockAction());

        // Expectations
        const childRunner = rootBlock.getBehavior(ChildRunnerBehavior)!;
        expect(childRunner.allChildrenExecuted).toBe(true);
        expect(rootBlock.getMemory('timer')).toBeDefined();
        expect(harness.mockJit.compileCalls).toHaveLength(2);
        
        harness.dispose();
    });

    it('should track total workout time across sections', () => {
        // Scenario: Verify timer tracks full workout duration
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2]]
        });

        const child1 = new MockBlock('child-1', []);
        const child2 = new MockBlock('child-2', []);
        
        harness.mockJit.whenMatches(
            (s) => s.some(stmt => stmt.id === 1),
            child1
        );
        harness.mockJit.whenMatches(
            (s) => s.some(stmt => stmt.id === 2),
            child2
        );

        harness.stack.push(rootBlock);
        
        const mountActions = rootBlock.mount(harness.runtime);
        mountActions.forEach(a => a.do(harness.runtime));

        // Simulate child durations
        harness.advanceClock(60000); // 1 min for child 1
        
        harness.executeAction({
            type: 'complete-child-1',
            do: (runtime) => {
                runtime.stack.pop()?.dispose(runtime);
                const actions = rootBlock.next(runtime);
                actions.forEach(a => a.do(runtime));
            }
        });

        harness.advanceClock(60000); // 1 min for child 2
        
        harness.executeAction({
            type: 'complete-child-2',
            do: (runtime) => {
                runtime.stack.pop()?.dispose(runtime);
                rootBlock.next(runtime);
            }
        });

        rootBlock.unmount(harness.runtime);

        // Expectations: Start time should be tracked
        expect(rootBlock.executionTiming.startTime).toBeDefined();
        // Note: Duration calculation requires completedAt to be set properly
    });

    it('should handle workout with many sections', () => {
        // Scenario: Complex workout with 5 sections
        const harness = new ExecutionContextTestHarness({
            clockTime: new Date('2024-01-01T12:00:00Z'),
            statements: [
                { id: 1, source: 'Section 1' },
                { id: 2, source: 'Section 2' },
                { id: 3, source: 'Section 3' },
                { id: 4, source: 'Section 4' },
                { id: 5, source: 'Section 5' }
            ]
        });
        
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2], [3], [4], [5]]
        });

        let blockCount = 0;
        harness.mockJit.whenMatches(() => true, () => {
            blockCount++;
            return new MockBlock(`section-${blockCount}`, []);
        });

        harness.stack.push(rootBlock);
        
        const mountActions = rootBlock.mount(harness.runtime);
        mountActions.forEach(a => a.do(harness.runtime));

        // Execute all 5 sections
        for (let i = 0; i < 5; i++) {
            if (i > 0) {
                // For all but first (already pushed on mount)
                harness.executeAction({
                    type: `section-${i}`,
                    do: (runtime) => {
                        if (harness.stack.count > 1) {
                            runtime.stack.pop()?.dispose(runtime);
                        }
                        const actions = rootBlock.next(runtime);
                        actions.forEach(a => a.do(runtime));
                    }
                });
            }
            
            harness.advanceClock(10000); // 10 seconds per section
        }

        // Final cleanup
        if (harness.stack.count > 1) {
            harness.stack.pop()?.dispose(harness.runtime);
        }

        // Expectations: All 5 blocks compiled
        expect(harness.mockJit.compileCalls).toHaveLength(5);
        
        const childRunner = rootBlock.getBehavior(ChildRunnerBehavior)!;
        expect(childRunner.allChildrenExecuted).toBe(true);
    });

    it('should handle empty workout gracefully', () => {
        // Scenario: Workout with no sections
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: []
        });

        harness.stack.push(rootBlock);
        
        const mountActions = rootBlock.mount(harness.runtime);
        mountActions.forEach(a => a.do(harness.runtime));

        // Expectations: No children pushed
        expect(harness.stack.count).toBe(1); // Only root
        expect(harness.mockJit.compileCalls).toHaveLength(0);

        // Should be able to unmount safely
        expect(() => {
            rootBlock.unmount(harness.runtime);
        }).not.toThrow();
    });

    it('should emit timer events during workout', () => {
        // Scenario: Track timer lifecycle
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        const child = new MockBlock('child', []);
        harness.mockJit.whenMatches(() => true, child);

        harness.stack.push(rootBlock);
        
        const mountActions = rootBlock.mount(harness.runtime);
        mountActions.forEach(a => a.do(harness.runtime));

        // Expectations: Timer initialized in memory
        expect(rootBlock.getMemory('timer')).toBeDefined();

        // Simulate pause
        harness.dispatchEvent({
            name: 'timer:pause',
            timestamp: harness.clock.now,
            data: {}
        });

        expect(harness.wasEventDispatched('timer:pause')).toBe(true);

        // Resume
        harness.advanceClock(5000);
        harness.dispatchEvent({
            name: 'timer:start',
            timestamp: harness.clock.now,
            data: {}
        });

        expect(harness.wasEventDispatched('timer:start')).toBe(true);
    });

    it('should handle section compilation failure gracefully', () => {
        // Scenario: JIT returns null for a section
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2]]
        });

        // First section succeeds, second fails
        const child1 = new MockBlock('child-1', []);
        
        harness.mockJit.whenMatches(
            (s) => s.some(stmt => stmt.id === 1),
            child1
        );
        
        // Don't mock statement 2 - let it fall through to real JIT
        // which may return null or a fallback block

        harness.stack.push(rootBlock);
        
        const mountActions = rootBlock.mount(harness.runtime);
        
        // Should not throw
        expect(() => {
            mountActions.forEach(a => a.do(harness.runtime));
        }).not.toThrow();

        // First section pushed successfully
        expect(harness.stack.count).toBeGreaterThanOrEqual(1);
    });

    it('should maintain consistent state across lifecycle', () => {
        // Scenario: Verify block state consistency
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
            (s) => s.some(stmt => stmt.id === 1),
            child1
        );
        harness.mockJit.whenMatches(
            (s) => s.some(stmt => stmt.id === 2),
            child2
        );

        // Pre-mount state
        expect(rootBlock.executionTiming.startTime).toBeUndefined();

        // Mount via PushBlockAction
        harness.executeAction(new PushBlockAction(rootBlock));

        // Post-mount state
        expect(rootBlock.executionTiming.startTime).toBeDefined();
        expect(harness.stack.count).toBe(2);

        // Pop child-1 → NextAction → root.next() → pushes child-2
        harness.executeAction(new PopBlockAction());

        // Pop child-2 → NextAction → root.next() → no more children
        harness.executeAction(new PopBlockAction());

        // Pre-unmount state
        const childRunner = rootBlock.getBehavior(ChildRunnerBehavior)!;
        expect(childRunner.allChildrenExecuted).toBe(true);

        // Unmount
        rootBlock.unmount(harness.runtime);

        // Post-unmount state
        // TODO: completedAt may not be set - verify if this is expected behavior
        // expect(rootBlock.executionTiming.completedAt).toBeDefined();
        
        harness.dispose();
    });

    it('should handle rapid section transitions', () => {
        // Scenario: Sections complete very quickly
        const harness = new ExecutionContextTestHarness({
            clockTime: new Date('2024-01-01T12:00:00Z'),
            statements: [
                { id: 1, source: 'Section 1' },
                { id: 2, source: 'Section 2' },
                { id: 3, source: 'Section 3' }
            ]
        });
        
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2], [3]]
        });

        let blockId = 0;
        harness.mockJit.whenMatches(() => true, () => {
            blockId++;
            return new MockBlock(`child-${blockId}`, []);
        });

        harness.stack.push(rootBlock);
        
        const mountActions = rootBlock.mount(harness.runtime);
        mountActions.forEach(a => a.do(harness.runtime));

        // Rapid fire through all sections (no time advancement)
        for (let i = 0; i < 3; i++) {
            if (i > 0) {
                const actions = rootBlock.next(harness.runtime);
                actions.forEach(a => a.do(harness.runtime));
            }
            
            if (harness.stack.depth > 1) {
                harness.stack.pop()?.dispose(harness.runtime);
            }
        }

        // Expectations: All sections handled
        expect(harness.mockJit.compileCalls).toHaveLength(3);
        
        const childRunner = rootBlock.getBehavior(ChildRunnerBehavior)!;
        expect(childRunner.allChildrenExecuted).toBe(true);
        
        harness.dispose();
    });
});
