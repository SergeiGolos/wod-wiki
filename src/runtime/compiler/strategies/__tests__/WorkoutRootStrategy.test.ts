import { describe, it, expect, beforeEach } from 'bun:test';
import { WorkoutRootStrategy, WorkoutRootConfig } from '../WorkoutRootStrategy';
import { IScriptRuntime } from '../../../contracts/IScriptRuntime';
import {
    CountupTimerBehavior,
    LabelingBehavior,
    ChildSelectionBehavior,
    ButtonBehavior,
    HistoryRecordBehavior,
    CompletionTimestampBehavior
} from '../../../behaviors';

// Mock runtime
const mockRuntime: IScriptRuntime = {
    clock: { now: new Date(1000) },
    events: { subscribe: () => ({ unsubscribe: () => {} }) },
    compiler: {} as any,
    stack: {} as any,
} as any;

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

    describe('build()', () => {
        it('should include all required behaviors for single-round workout', () => {
            const config: WorkoutRootConfig = {
                childGroups: [[1], [2], [3]],
                totalRounds: 1
            };

            const block = strategy.build(mockRuntime, config);
            const behaviors = (block as any).behaviors;

            // Check required behavior types are present (new aspect-based behaviors)
            expect(behaviors.some((b: any) => b instanceof CountupTimerBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof LabelingBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof ButtonBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof ChildSelectionBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof HistoryRecordBehavior)).toBe(true);

            // Check universal invariants are present
            expect(behaviors.some((b: any) => b instanceof CompletionTimestampBehavior)).toBe(true);
        });

        it('should include ChildSelectionBehavior without round config for single-round workout', () => {
            const config: WorkoutRootConfig = {
                childGroups: [[1]],
                totalRounds: 1
            };

            const block = strategy.build(mockRuntime, config);
            const csb = block.getBehavior(ChildSelectionBehavior);

            // Single-round: ChildSelectionBehavior present but no round config (asRepeater not called for totalRounds <= 1)
            expect(csb).toBeDefined();
            expect((csb as any).config?.totalRounds).toBeUndefined();
        });

        it('should include round tracking behaviors for multi-round workout', () => {
            const config: WorkoutRootConfig = {
                childGroups: [[1]],
                totalRounds: 3
            };

            const block = strategy.build(mockRuntime, config);
            const behaviors = (block as any).behaviors;

            // Round config is now absorbed into ChildSelectionBehavior
            const childBehavior = behaviors.find((b: any) => b instanceof ChildSelectionBehavior);
            expect(childBehavior).toBeDefined();
            expect((childBehavior as any).config?.startRound).toBeDefined();
            expect((childBehavior as any).config?.totalRounds).toBe(3);
        });

        it('should include expected behavior count for single-round workout', () => {
            const config: WorkoutRootConfig = {
                childGroups: [[1]],
                totalRounds: 1
            };

            const block = strategy.build(mockRuntime, config);
            const behaviors = (block as any).behaviors;

            // Expected: Timer (1) + Children (1) + Display (1) + Controls (1) + History (1) + Universal (1) = 6
            expect(behaviors.length).toBe(6);
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
