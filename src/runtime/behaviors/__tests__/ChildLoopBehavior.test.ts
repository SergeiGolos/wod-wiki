import { describe, it, expect, vi } from 'bun:test';
import { ChildLoopBehavior } from '../ChildLoopBehavior';
import { ChildRunnerBehavior } from '../ChildRunnerBehavior';
import { RestBlockBehavior } from '../RestBlockBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { TimerState, RoundState } from '../../memory/MemoryTypes';
import { TimeSpan } from '../../models/TimeSpan';

function createMockContext(overrides: {
    timerState?: TimerState;
    roundState?: RoundState;
    childRunner?: ChildRunnerBehavior;
    restBehavior?: RestBlockBehavior;
    clockNow?: number;
    isComplete?: boolean;
} = {}): IBehaviorContext {
    const memoryStore = new Map<string, any>();

    if (overrides.timerState) {
        memoryStore.set('timer', overrides.timerState);
    }
    if (overrides.roundState) {
        memoryStore.set('round', overrides.roundState);
    }

    const behaviorsMap = new Map<any, any>();
    if (overrides.childRunner) {
        behaviorsMap.set(ChildRunnerBehavior, overrides.childRunner);
    }
    if (overrides.restBehavior) {
        behaviorsMap.set(RestBlockBehavior, overrides.restBehavior);
    }

    const block = {
        key: { toString: () => 'test-block' },
        label: 'Test Block',
        fragments: [],
        isComplete: overrides.isComplete ?? false,
        getBehavior: vi.fn((type: any) => behaviorsMap.get(type))
    } as unknown as IRuntimeBlock;

    return {
        block,
        clock: { now: new Date(overrides.clockNow ?? 1000) },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((type: string) => memoryStore.get(type)),
        setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value))
    } as unknown as IBehaviorContext;
}

function createAllExecutedRunner(): ChildRunnerBehavior {
    const runner = new ChildRunnerBehavior({ childGroups: [[1]] });
    const dummyCtx = createMockContext();
    runner.onMount(dummyCtx); // dispatches child 0 (childIndex → 1)
    return runner;
}

describe('ChildLoopBehavior', () => {
    describe('onMount', () => {
        it('should return no actions on mount', () => {
            const behavior = new ChildLoopBehavior({ childGroups: [[1]] });
            const ctx = createMockContext();
            const actions = behavior.onMount(ctx);
            expect(actions).toEqual([]);
        });
    });

    describe('onNext - loop conditions', () => {
        it('should not reset when children are still executing', () => {
            const childRunner = new ChildRunnerBehavior({ childGroups: [[1], [2]] });
            // childRunner has not dispatched all children
            const behavior = new ChildLoopBehavior({ childGroups: [[1], [2]] });

            const ctx = createMockContext({
                childRunner,
                roundState: { current: 1, total: 3 }
            });

            behavior.onNext(ctx);

            expect(childRunner.allChildrenExecuted).toBe(false);
        });

        it('should reset childIndex when countdown timer is still running', () => {
            const childRunner = createAllExecutedRunner();
            const behavior = new ChildLoopBehavior({ childGroups: [[1]] });

            // Timer started at 0, duration 60s, now at 10s (50s remaining)
            const ctx = createMockContext({
                childRunner,
                timerState: {
                    direction: 'down',
                    durationMs: 60000,
                    spans: [new TimeSpan(0)],
                    label: 'AMRAP',
                    role: 'primary'
                },
                clockNow: 10000
            });

            behavior.onNext(ctx);

            // After reset, allChildrenExecuted should be false
            expect(childRunner.allChildrenExecuted).toBe(false);
        });

        it('should NOT reset when countdown timer has expired', () => {
            const childRunner = createAllExecutedRunner();
            const behavior = new ChildLoopBehavior({ childGroups: [[1]] });

            // Timer started at 0, duration 60s, now at 70s (expired)
            const ctx = createMockContext({
                childRunner,
                timerState: {
                    direction: 'down',
                    durationMs: 60000,
                    spans: [new TimeSpan(0)],
                    label: 'AMRAP',
                    role: 'primary'
                },
                clockNow: 70000
            });

            behavior.onNext(ctx);

            // Should NOT have reset
            expect(childRunner.allChildrenExecuted).toBe(true);
        });

        it('should reset for unbounded rounds (AMRAP)', () => {
            const childRunner = createAllExecutedRunner();
            const behavior = new ChildLoopBehavior({ childGroups: [[1]] });

            const ctx = createMockContext({
                childRunner,
                roundState: { current: 1, total: undefined } // Unbounded
            });

            behavior.onNext(ctx);

            expect(childRunner.allChildrenExecuted).toBe(false);
        });

        it('should reset for bounded rounds when rounds remain', () => {
            const childRunner = createAllExecutedRunner();
            const behavior = new ChildLoopBehavior({ childGroups: [[1]] });

            const ctx = createMockContext({
                childRunner,
                roundState: { current: 2, total: 5 }
            });

            behavior.onNext(ctx);

            expect(childRunner.allChildrenExecuted).toBe(false);
        });

        it('should NOT reset when bounded rounds are exhausted', () => {
            const childRunner = createAllExecutedRunner();
            const behavior = new ChildLoopBehavior({ childGroups: [[1]] });

            const ctx = createMockContext({
                childRunner,
                roundState: { current: 6, total: 5 } // Exceeded
            });

            behavior.onNext(ctx);

            expect(childRunner.allChildrenExecuted).toBe(true);
        });

        it('should NOT reset when block is marked complete', () => {
            const childRunner = createAllExecutedRunner();
            const behavior = new ChildLoopBehavior({ childGroups: [[1]] });

            const ctx = createMockContext({
                childRunner,
                roundState: { current: 1, total: undefined },
                isComplete: true
            });

            behavior.onNext(ctx);

            expect(childRunner.allChildrenExecuted).toBe(true);
        });
    });

    describe('onNext - RestBlockBehavior integration', () => {
        it('should NOT reset when rest is pending', () => {
            const childRunner = createAllExecutedRunner();
            const restBehavior = new RestBlockBehavior();

            // Simulate rest being pushed
            const pushCtx = createMockContext({
                childRunner,
                timerState: {
                    direction: 'down',
                    durationMs: 60000,
                    spans: [new TimeSpan(0)],
                    label: 'Timer',
                    role: 'primary'
                },
                clockNow: 30000,
                restBehavior
            });
            // Manually set rest pending to avoid needing full behavior chain
            (restBehavior as any)._isRestPending = true;

            const behavior = new ChildLoopBehavior({ childGroups: [[1]] });

            const ctx = createMockContext({
                childRunner,
                restBehavior,
                roundState: { current: 1, total: undefined }, // Would normally loop
                clockNow: 30000
            });

            behavior.onNext(ctx);

            // Should NOT have reset because rest is pending
            expect(childRunner.allChildrenExecuted).toBe(true);
        });

        it('should reset after rest completes (isRestPending = false)', () => {
            const childRunner = createAllExecutedRunner();
            const restBehavior = new RestBlockBehavior();
            // Rest is NOT pending (already completed)

            const behavior = new ChildLoopBehavior({ childGroups: [[1]] });

            const ctx = createMockContext({
                childRunner,
                restBehavior,
                roundState: { current: 1, total: undefined }
            });

            behavior.onNext(ctx);

            // Should reset because no rest is pending
            expect(childRunner.allChildrenExecuted).toBe(false);
        });
    });

    describe('onUnmount', () => {
        it('should return no actions on unmount', () => {
            const behavior = new ChildLoopBehavior({ childGroups: [[1]] });
            const ctx = createMockContext();
            const actions = behavior.onUnmount(ctx);
            expect(actions).toEqual([]);
        });
    });
});
