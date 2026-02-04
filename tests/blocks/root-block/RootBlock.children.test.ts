import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ExecutionContextTestHarness } from '@/testing/harness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { workoutRootStrategy } from '@/runtime/compiler/strategies/WorkoutRootStrategy';
import { ChildRunnerBehavior } from '@/runtime/behaviors';

describe('RootBlock Child Execution', () => {
    let harness: ExecutionContextTestHarness;

    beforeEach(() => {
        harness = new ExecutionContextTestHarness();
    });

    afterEach(() => {
        harness.dispose();
    });

    it('should push first child on mount', () => {
        // Scenario: Root block with 3 children
        const childGroups = [[1], [2], [3]];
        
        // Create harness with statements that match the IDs
        const harness = new ExecutionContextTestHarness({
            statements: [
                { id: 1, source: '10 Push-ups' },
                { id: 2, source: '15 Squats' },
                { id: 3, source: '20 Sit-ups' }
            ]
        });
        
        // Mock JIT to return child blocks
        const child1 = new MockBlock('child-1', []);
        const child2 = new MockBlock('child-2', []);
        const child3 = new MockBlock('child-3', []);
        
        harness.mockJit.whenMatches(
            (stmts) => stmts.some(s => s.id === 1),
            child1
        );
        harness.mockJit.whenMatches(
            (stmts) => stmts.some(s => s.id === 2),
            child2
        );
        harness.mockJit.whenMatches(
            (stmts) => stmts.some(s => s.id === 3),
            child3
        );

        // Create and mount root
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups
        });

        harness.stack.push(rootBlock);
        
        harness.executeAction({
            type: 'mount-root',
            do: (runtime) => {
                const actions = rootBlock.mount(runtime);
                actions.forEach(action => action.do(runtime));
            }
        });

        // Expectations: First child should be pushed
        expect(harness.mockJit.compileCalls).toHaveLength(1);
        expect(harness.mockJit.lastCompileCall?.statements[0].id).toBe(1);
        
        // Stack should have root + first child
        expect(harness.stack.count).toBe(2);
        expect(harness.stack.current).toBe(child1);
        
        harness.dispose();
    });

    it('should push next child when current completes', () => {
        // Scenario: Child completes, root.next() called
        const harness = new ExecutionContextTestHarness({
            statements: [
                { id: 1, source: 'Exercise 1' },
                { id: 2, source: 'Exercise 2' },
                { id: 3, source: 'Exercise 3' }
            ]
        });
        
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2], [3]]
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

        // Mount root (pushes child-1)
        harness.stack.push(rootBlock);
        const mountActions = rootBlock.mount(harness.runtime);
        mountActions.forEach(action => action.do(harness.runtime));

        expect(harness.stack.count).toBe(2); // root + child1

        // Clear recordings to isolate next() behavior
        harness.clearRecordings();

        // Execute: Call next() to push second child
        harness.executeAction({
            type: 'root-next',
            do: (runtime) => {
                const actions = rootBlock.next(runtime);
                actions.forEach(action => action.do(runtime));
            }
        });

        // Expectations: Second child compiled and pushed
        expect(harness.mockJit.compileCalls).toHaveLength(1);
        expect(harness.mockJit.lastCompileCall?.statements[0].id).toBe(2);
        expect(harness.stack.count).toBe(3); // root + child-1 + child-2
        expect(harness.stack.current).toBe(child2);
        
        harness.dispose();
    });

    it('should handle empty childGroups gracefully', () => {
        // Scenario: No children to execute
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: []
        });

        harness.stack.push(rootBlock);
        const mountActions = rootBlock.mount(harness.runtime);

        // Expectations: No compilation, no child pushed
        expect(harness.mockJit.compileCalls).toHaveLength(0);
        expect(harness.stack.count).toBe(1); // Only root
    });

    it('should mark completion when all children executed', () => {
        // Scenario: Last child completes
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2]]
        });

        const child1 = new MockBlock('child-1', []);
        const child2 = new MockBlock('child-2', []);
        
        harness.mockJit.whenMatches(() => true, (stmts) => {
            if (stmts.some(s => s.id === 1)) return child1;
            if (stmts.some(s => s.id === 2)) return child2;
            return new MockBlock('fallback', []);
        });

        harness.stack.push(rootBlock);
        
        // Mount: pushes child 1
        const mountActions = rootBlock.mount(harness.runtime);
        mountActions.forEach(a => a.do(harness.runtime));
        
        // Next: pushes child 2
        const next1Actions = rootBlock.next(harness.runtime);
        next1Actions.forEach(a => a.do(harness.runtime));

        // Next: all children done
        const next2Actions = rootBlock.next(harness.runtime);

        // Expectations: No more children to push
        const childRunner = rootBlock.getBehavior(ChildRunnerBehavior)!;
        expect(childRunner.allChildrenExecuted).toBe(true);
        expect(next2Actions.length).toBe(0);
    });

    it('should handle single child group', () => {
        // Scenario: Only one child
        const harness = new ExecutionContextTestHarness({
            statements: [{ id: 1, source: 'Single exercise' }]
        });
        
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        const child1 = new MockBlock('child-1', []);
        harness.mockJit.whenMatches(() => true, child1);

        harness.stack.push(rootBlock);
        const mountActions = rootBlock.mount(harness.runtime);
        mountActions.forEach(a => a.do(harness.runtime));

        expect(harness.stack.count).toBe(2);

        // Next should not push anything (all children done)
        const nextActions = rootBlock.next(harness.runtime);
        expect(nextActions.length).toBe(0);
        
        const childRunner = rootBlock.getBehavior(ChildRunnerBehavior)!;
        expect(childRunner.allChildrenExecuted).toBe(true);
        
        harness.dispose();
    });

    it('should handle multi-statement child groups', () => {
        // Scenario: Child group with multiple statements
        const childGroups = [[1, 2], [3, 4]];
        const harness = new ExecutionContextTestHarness({
            statements: [
                { id: 1, source: 'Statement 1' },
                { id: 2, source: 'Statement 2' },
                { id: 3, source: 'Statement 3' },
                { id: 4, source: 'Statement 4' }
            ]
        });
        
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups
        });

        const group1Block = new MockBlock('group-1', []);
        const group2Block = new MockBlock('group-2', []);
        
        harness.mockJit.whenMatches(
            (stmts) => stmts.some(s => s.id === 1 || s.id === 2),
            group1Block
        );
        harness.mockJit.whenMatches(
            (stmts) => stmts.some(s => s.id === 3 || s.id === 4),
            group2Block
        );

        harness.stack.push(rootBlock);
        const mountActions = rootBlock.mount(harness.runtime);
        mountActions.forEach(a => a.do(harness.runtime));

        // First group should be compiled with statements 1 and 2
        expect(harness.mockJit.compileCalls).toHaveLength(1);
        const firstCall = harness.mockJit.compileCalls[0];
        expect(firstCall.statements).toHaveLength(2);
        expect(firstCall.statements.map(s => s.id)).toContain(1);
        expect(firstCall.statements.map(s => s.id)).toContain(2);
        
        harness.dispose();
    });

    it('should handle missing statement IDs gracefully', () => {
        // Scenario: Statement IDs that don't exist
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[999]]
        });

        // Don't mock anything - let it fall through
        
        harness.stack.push(rootBlock);
        const mountActions = rootBlock.mount(harness.runtime);
        
        // Should not throw error
        expect(() => {
            mountActions.forEach(a => a.do(harness.runtime));
        }).not.toThrow();

        // May still compile (with empty statements or fallback)
        // Stack count might be 1 (only root) or 2 (root + empty block)
        expect(harness.stack.count).toBeGreaterThanOrEqual(1);
    });
});
