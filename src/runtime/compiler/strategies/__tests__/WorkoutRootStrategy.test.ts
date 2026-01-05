import { describe, it, expect, beforeEach } from 'bun:test';
import { WorkoutRootStrategy, WorkoutRootConfig } from '../WorkoutRootStrategy';
import { RuntimeControlsBehavior } from '../../../behaviors/RuntimeControlsBehavior';
import { TimerBehavior } from '../../../behaviors/TimerBehavior';
import { ChildIndexBehavior } from '../../../behaviors/ChildIndexBehavior';
import { RoundPerLoopBehavior } from '../../../behaviors/RoundPerLoopBehavior';
import { WorkoutStateBehavior } from '../../../behaviors/WorkoutStateBehavior';
import { DisplayModeBehavior } from '../../../behaviors/DisplayModeBehavior';
import { TimerPauseResumeBehavior } from '../../../behaviors/TimerPauseResumeBehavior';
import { WorkoutControlButtonsBehavior } from '../../../behaviors/WorkoutControlButtonsBehavior';
import { IdleInjectionBehavior } from '../../../behaviors/IdleInjectionBehavior';
import { WorkoutFlowStateMachine } from '../../../behaviors/WorkoutFlowStateMachine';
import { WorkoutOrchestrator } from '../../../behaviors/WorkoutOrchestrator';
import { RoundDisplayBehavior } from '../../../behaviors/RoundDisplayBehavior';
import { RoundSpanBehavior } from '../../../behaviors/RoundSpanBehavior';
import { LapTimerBehavior } from '../../../behaviors/LapTimerBehavior';

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

            // Check required behavior types are present
            expect(behaviors.some(b => b instanceof RuntimeControlsBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof WorkoutStateBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof DisplayModeBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof TimerBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof TimerPauseResumeBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof WorkoutFlowStateMachine)).toBe(true);
            expect(behaviors.some(b => b instanceof ChildIndexBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof RoundPerLoopBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof WorkoutOrchestrator)).toBe(true);
            expect(behaviors.some(b => b instanceof WorkoutControlButtonsBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof IdleInjectionBehavior)).toBe(true);
        });

        it('should NOT include round tracking behaviors for single-round workout', () => {
            const config: WorkoutRootConfig = {
                childGroups: [[1]],
                totalRounds: 1
            };

            const behaviors = strategy.buildBehaviors(config);

            expect(behaviors.some(b => b instanceof RoundDisplayBehavior)).toBe(false);
            expect(behaviors.some(b => b instanceof RoundSpanBehavior)).toBe(false);
            expect(behaviors.some(b => b instanceof LapTimerBehavior)).toBe(false);
        });

        it('should include round tracking behaviors for multi-round workout', () => {
            const config: WorkoutRootConfig = {
                childGroups: [[1]],
                totalRounds: 3
            };

            const behaviors = strategy.buildBehaviors(config);

            expect(behaviors.some(b => b instanceof RoundDisplayBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof RoundSpanBehavior)).toBe(true);
            expect(behaviors.some(b => b instanceof LapTimerBehavior)).toBe(true);
        });

        it('should include two IdleInjectionBehaviors (start and end)', () => {
            const config: WorkoutRootConfig = {
                childGroups: [[1]],
                totalRounds: 1
            };

            const behaviors = strategy.buildBehaviors(config);
            const idleBehaviors = behaviors.filter(b => b instanceof IdleInjectionBehavior);

            expect(idleBehaviors.length).toBe(2);
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
