import { describe, it, expect, beforeEach } from 'bun:test';
import { WorkoutRootStrategy, WorkoutRootConfig } from '../WorkoutRootStrategy';
import {
    TimerInitBehavior,
    TimerTickBehavior,
    TimerPauseBehavior,
    RoundInitBehavior,
    RoundAdvanceBehavior,
    RoundCompletionBehavior,
    RoundDisplayBehavior,
    ChildRunnerBehavior,
    DisplayInitBehavior,
    ControlsInitBehavior,
    HistoryRecordBehavior
} from '../../../behaviors';

describe('WorkoutRootStrategy', () => {
    let strategy: WorkoutRootStrategy;

    beforeEach(() => {
        strategy = new WorkoutRootStrategy();
    });

    describe('match()', () => {
        it('should always return false (root blocks are built directly)', () => {
            expect(strategy.match([], {} as any)).toBe(false);
        });
    });

    describe('compile()', () => {
        it('should throw an error (root blocks should use build())', () => {
            expect(() => strategy.compile([], {} as any)).toThrow();
        });
    });

    describe('buildBehaviors()', () => {
        it('should include all required behaviors for single-round workout', () => {
            const config: WorkoutRootConfig = {
                childGroups: [[1], [2], [3]],
                totalRounds: 1
            };

            const behaviors = strategy.buildBehaviors(config);

            // Check required behavior types are present (new aspect-based behaviors)
            expect(behaviors.some(b => b instanceof TimerInitBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof TimerTickBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof TimerPauseBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof DisplayInitBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof ControlsInitBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof ChildRunnerBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof HistoryRecordBehavior)).toBe(true);
        });

        it('should NOT include round tracking behaviors for single-round workout', () => {
            const config: WorkoutRootConfig = {
                childGroups: [[1]],
                totalRounds: 1
            };

            const behaviors = strategy.buildBehaviors(config);

            expect(behaviors.some(b => b instanceof RoundInitBehavior)).toBe(false);
            expect(behaviors.some(b => b instanceof RoundDisplayBehavior)).toBe(false);
            expect(behaviors.some(b => b instanceof RoundAdvanceBehavior)).toBe(false);
            expect(behaviors.some(b => b instanceof RoundCompletionBehavior)).toBe(false);
        });

        it('should include round tracking behaviors for multi-round workout', () => {
            const config: WorkoutRootConfig = {
                childGroups: [[1]],
                totalRounds: 3
            };

            const behaviors = strategy.buildBehaviors(config);

            expect(behaviors.some(b => b instanceof RoundInitBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof RoundDisplayBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof RoundAdvanceBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof RoundCompletionBehavior)).toBe(true);
        });

        it('should include expected behavior count for single-round workout', () => {
            const config: WorkoutRootConfig = {
                childGroups: [[1]],
                totalRounds: 1
            };

            const behaviors = strategy.buildBehaviors(config);
            
            // Expected: Timer (3) + Children (1) + Display (1) + Controls (1) + History (1) = 7
            expect(behaviors.length).toBe(7);
        });
    });

    describe('static helpers', () => {
        it('getDefaultStartIdle should return start idle config', () => {
            const config = WorkoutRootStrategy.getDefaultStartIdle();
            expect(config.id).toBe('idle-start');
            expect(config.label).toBe('Ready');
            expect(config.popOnNext).toBe(true);
        });

        it('getDefaultEndIdle should return end idle config', () => {
            const config = WorkoutRootStrategy.getDefaultEndIdle();
            expect(config.id).toBe('idle-end');
            expect(config.popOnNext).toBe(false);
            expect(config.popOnEvents).toContain('stop');
        });
    });
});
