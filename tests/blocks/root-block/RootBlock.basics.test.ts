import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ExecutionContextTestHarness } from '@/testing/harness';
import { workoutRootStrategy } from '@/runtime/compiler/strategies/WorkoutRootStrategy';
import {
    TimerBehavior,
    ChildSelectionBehavior,
    DisplayInitBehavior,
    ButtonBehavior,
    HistoryRecordBehavior
} from '@/runtime/behaviors';

describe('RootBlock Behavior Composition', () => {
    let harness: ExecutionContextTestHarness;

    beforeEach(() => {
        harness = new ExecutionContextTestHarness();
    });

    afterEach(() => {
        harness.dispose();
    });

    it('should include all required behaviors for single-round workout', () => {
        // Scenario: Create root block with single round
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2], [3]],
            totalRounds: 1
        });

        // Expectations: All core behaviors present
        expect(rootBlock.getBehavior(TimerBehavior)).toBeDefined();
        expect(rootBlock.getBehavior(ChildSelectionBehavior)).toBeDefined();
        expect(rootBlock.getBehavior(DisplayInitBehavior)).toBeDefined();
        expect(rootBlock.getBehavior(ButtonBehavior)).toBeDefined();
        expect(rootBlock.getBehavior(HistoryRecordBehavior)).toBeDefined();
    });

    it('should use default totalRounds=1 when not specified', () => {
        // Scenario: No totalRounds specified
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        // Expectations: Single round configuration
        expect(rootBlock).toBeDefined();
        expect(rootBlock.blockType).toBe('Root');
    });

    it('should configure ChildSelectionBehavior with correct childGroups', () => {
        // Scenario: Multiple child groups
        const childGroups = [[1, 2], [3], [4, 5]];
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups
        });

        const childSelection = rootBlock.getBehavior(ChildSelectionBehavior);
        expect(childSelection).toBeDefined();

        // Verify sourceIds include all statements
        expect(rootBlock.sourceIds).toEqual([1, 2, 3, 4, 5]);
    });

    it('should use custom execution buttons when provided', () => {
        // Scenario: Custom control buttons
        const customButtons = [
            { id: 'custom-pause', label: 'Hold', action: 'timer:pause' },
            { id: 'skip', label: 'Skip', action: 'block:skip' }
        ];

        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]],
            executionButtons: customButtons
        });

        const controls = rootBlock.getBehavior(ButtonBehavior);
        expect(controls).toBeDefined();
    });

    it('should handle empty childGroups', () => {
        // Scenario: Root block with no children
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: []
        });

        expect(rootBlock).toBeDefined();
        expect(rootBlock.sourceIds).toEqual([]);
        expect(rootBlock.getBehavior(ChildSelectionBehavior)).toBeDefined();
    });

    it('should set correct block type and label', () => {
        // Scenario: Verify root block metadata
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        expect(rootBlock.blockType).toBe('Root');
        expect(rootBlock.label).toBe('Workout');
    });
});
