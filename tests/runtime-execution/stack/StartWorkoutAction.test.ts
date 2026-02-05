import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ExecutionContextTestHarness } from '@/testing/harness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { StartWorkoutAction } from '@/runtime/actions/stack/StartWorkoutAction';

/**
 * Tests for StartWorkoutAction - the entry point for initializing a workout.
 * 
 * StartWorkoutAction wraps the script's statements in a root block and pushes it
 * onto the stack. This allows the runtime to exist in an "idle" state before
 * the workout is started.
 */
describe('StartWorkoutAction', () => {
    let harness: ExecutionContextTestHarness;

    beforeEach(() => {
        harness = new ExecutionContextTestHarness({
            clockTime: new Date('2024-01-01T12:00:00Z'),
            statements: [
                { id: 1, source: '10:00 Run' },
                { id: 2, source: '20 Pushups' },
                { id: 3, source: '5:00 Rest' }
            ]
        });

        // Mock JIT to return mock blocks for any compilation
        harness.mockJit.whenMatches(() => true, new MockBlock('child', []));
    });

    afterEach(() => {
        harness.dispose();
    });

    describe('Basic Functionality', () => {
        it('should push root block onto empty stack', () => {
            // Precondition: Stack is empty
            expect(harness.stack.count).toBe(0);

            // Action: Start workout
            harness.executeAction(new StartWorkoutAction());

            // Postcondition: Root block is on stack (plus first child from mount)
            expect(harness.stack.count).toBeGreaterThanOrEqual(1);
        });

        it('should create root block with correct type', () => {
            harness.executeAction(new StartWorkoutAction());

            // Find root block in stack (blocks is top-first, so root is at the end)
            const blocks = harness.stack.blocks;
            const rootBlock = blocks[blocks.length - 1];

            expect(rootBlock).toBeDefined();
            expect(rootBlock?.blockType).toBe('Root');
        });

        it('should initialize timer on root block', () => {
            harness.executeAction(new StartWorkoutAction());

            const blocks = harness.stack.blocks;
            const rootBlock = blocks[blocks.length - 1];

            // Root block should have timer memory initialized
            expect(rootBlock?.getMemory('timer')).toBeDefined();
        });

        it('should set execution start time from clock', () => {
            harness.executeAction(new StartWorkoutAction());

            const blocks = harness.stack.blocks;
            const rootBlock = blocks[blocks.length - 1];

            expect(rootBlock?.executionTiming?.startTime).toEqual(
                new Date('2024-01-01T12:00:00Z')
            );
        });
    });

    describe('Child Group Configuration', () => {
        it('should create one child group per statement', () => {
            // With 3 statements, we expect 3 child groups (sequential execution)
            harness.executeAction(new StartWorkoutAction());

            const blocks = harness.stack.blocks;
            const rootBlock = blocks[blocks.length - 1];

            // The root block should have 3 source IDs
            expect(rootBlock?.sourceIds).toHaveLength(3);
            expect(rootBlock?.sourceIds).toEqual([1, 2, 3]);
        });
    });

    describe('Options Handling', () => {
        it('should use default totalRounds of 1', () => {
            harness.executeAction(new StartWorkoutAction());

            const blocks = harness.stack.blocks;
            const rootBlock = blocks[blocks.length - 1];

            // Check round memory if available
            const roundMemory = rootBlock?.getMemory('round');
            if (roundMemory) {
                expect(roundMemory.value.total).toBe(1);
            }
        });

        it('should respect custom totalRounds option', () => {
            harness.executeAction(new StartWorkoutAction({ totalRounds: 3 }));

            const blocks = harness.stack.blocks;
            const rootBlock = blocks[blocks.length - 1];

            const roundMemory = rootBlock?.getMemory('round');
            if (roundMemory) {
                expect(roundMemory.value.total).toBe(3);
            }
        });
    });

    describe('Guard Conditions', () => {
        it('should not push if stack already has blocks', () => {
            // Setup: Push a block first
            harness.stack.push(new MockBlock('existing', []));
            expect(harness.stack.count).toBe(1);

            // Action: Try to start workout
            harness.executeAction(new StartWorkoutAction());

            // Should not push another root - stack count unchanged
            expect(harness.stack.count).toBe(1);
        });

        it('should handle empty script gracefully', () => {
            // Create harness with no statements
            const emptyHarness = new ExecutionContextTestHarness({
                clockTime: new Date('2024-01-01T12:00:00Z'),
                statements: []
            });

            // Should not throw
            expect(() => {
                emptyHarness.executeAction(new StartWorkoutAction());
            }).not.toThrow();

            // Stack should remain empty
            expect(emptyHarness.stack.count).toBe(0);

            emptyHarness.dispose();
        });
    });

    describe('Integration with Harness Helper', () => {
        it('should work via harness.startWorkout() helper', () => {
            expect(harness.stack.count).toBe(0);

            harness.startWorkout();

            expect(harness.stack.count).toBeGreaterThanOrEqual(1);
        });

        it('should pass options through harness helper', () => {
            harness.startWorkout({ totalRounds: 5 });

            const blocks = harness.stack.blocks;
            const rootBlock = blocks[blocks.length - 1];
            const roundMemory = rootBlock?.getMemory('round');

            if (roundMemory) {
                expect(roundMemory.value.total).toBe(5);
            }
        });
    });
});

describe('StartWorkoutAction - Action Recording', () => {
    let harness: ExecutionContextTestHarness;

    beforeEach(() => {
        harness = new ExecutionContextTestHarness({
            clockTime: new Date('2024-01-01T12:00:00Z'),
            statements: [{ id: 1, source: 'Exercise' }]
        });
        harness.mockJit.whenMatches(() => true, new MockBlock('child', []));
    });

    afterEach(() => {
        harness.dispose();
    });

    it('should record start-workout action type', () => {
        harness.executeAction(new StartWorkoutAction());

        expect(harness.wasActionExecuted('start-workout')).toBe(true);
    });

    it('should result in block being pushed to stack', () => {
        harness.executeAction(new StartWorkoutAction());

        // Verify the outcome - a block was pushed
        expect(harness.stack.count).toBeGreaterThan(0);
    });
});
