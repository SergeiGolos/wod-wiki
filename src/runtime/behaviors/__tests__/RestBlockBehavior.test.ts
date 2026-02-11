import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { RestBlockBehavior } from '../RestBlockBehavior';
import { ChildRunnerBehavior } from '../ChildRunnerBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { TimerState } from '../../memory/MemoryTypes';
import { TimeSpan } from '../../models/TimeSpan';

/**
 * Creates a mock IBehaviorContext with controllable memory and behavior access.
 */
function createMockContext(overrides: {
    timerState?: TimerState;
    childRunner?: ChildRunnerBehavior;
    restBehavior?: RestBlockBehavior;
    clockNow?: number;
} = {}): IBehaviorContext {
    const memoryStore = new Map<string, any>();

    if (overrides.timerState) {
        memoryStore.set('timer', overrides.timerState);
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
        isComplete: false,
        getBehavior: vi.fn((type: any) => behaviorsMap.get(type))
    } as unknown as IRuntimeBlock;

    return {
        block,
        clock: { now: new Date(overrides.clockNow ?? 10000) },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((type: string) => memoryStore.get(type)),
        setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value))
    } as unknown as IBehaviorContext;
}

function createCountdownTimer(startTime: number, durationMs: number): TimerState {
    return {
        direction: 'down' as const,
        durationMs,
        spans: [new TimeSpan(startTime)],
        label: 'Interval Timer',
        role: 'primary'
    };
}

function createChildRunner(allExecuted: boolean): ChildRunnerBehavior {
    const runner = new ChildRunnerBehavior({ childGroups: [[1], [2], [3]] });
    // Simulate the runner having dispatched all children
    if (allExecuted) {
        // Advance childIndex past the end
        for (let i = 0; i < 3; i++) {
            runner.onNext(createMockContext());
        }
    }
    return runner;
}

describe('RestBlockBehavior', () => {
    describe('construction', () => {
        it('should create with default config', () => {
            const behavior = new RestBlockBehavior();
            expect(behavior.isRestPending).toBe(false);
        });

        it('should accept custom config', () => {
            const behavior = new RestBlockBehavior({
                minRestMs: 2000,
                label: 'Recovery'
            });
            expect(behavior.isRestPending).toBe(false);
        });
    });

    describe('onMount', () => {
        it('should return no actions on mount', () => {
            const behavior = new RestBlockBehavior();
            const ctx = createMockContext();
            const actions = behavior.onMount(ctx);
            expect(actions).toEqual([]);
        });
    });

    describe('onNext - rest insertion', () => {
        it('should not push rest when children are still executing', () => {
            const behavior = new RestBlockBehavior();
            const childRunner = new ChildRunnerBehavior({ childGroups: [[1], [2]] });
            // childRunner has not dispatched all children yet

            const ctx = createMockContext({
                childRunner,
                timerState: createCountdownTimer(0, 60000),
                clockNow: 10000
            });

            const actions = behavior.onNext(ctx);
            expect(actions).toEqual([]);
            expect(behavior.isRestPending).toBe(false);
        });

        it('should not push rest when no ChildRunnerBehavior present', () => {
            const behavior = new RestBlockBehavior();
            const ctx = createMockContext({
                timerState: createCountdownTimer(0, 60000),
                clockNow: 10000
            });

            const actions = behavior.onNext(ctx);
            expect(actions).toEqual([]);
        });

        it('should not push rest when no timer present', () => {
            const behavior = new RestBlockBehavior();
            const childRunner = createChildRunner(true);

            const ctx = createMockContext({ childRunner });

            const actions = behavior.onNext(ctx);
            expect(actions).toEqual([]);
            expect(behavior.isRestPending).toBe(false);
        });

        it('should not push rest when timer is countup (direction: up)', () => {
            const behavior = new RestBlockBehavior();
            const childRunner = createChildRunner(true);

            const ctx = createMockContext({
                childRunner,
                timerState: {
                    direction: 'up',
                    spans: [new TimeSpan(0)],
                    label: 'Elapsed',
                    role: 'primary'
                },
                clockNow: 10000
            });

            const actions = behavior.onNext(ctx);
            expect(actions).toEqual([]);
        });

        it('should not push rest when timer has expired', () => {
            const behavior = new RestBlockBehavior();
            const childRunner = createChildRunner(true);

            // Timer started at 0, duration 60000ms, now at 70000ms (expired)
            const ctx = createMockContext({
                childRunner,
                timerState: createCountdownTimer(0, 60000),
                clockNow: 70000
            });

            const actions = behavior.onNext(ctx);
            expect(actions).toEqual([]);
            expect(behavior.isRestPending).toBe(false);
        });

        it('should not push rest when remaining time is below minimum', () => {
            const behavior = new RestBlockBehavior({ minRestMs: 5000 });
            const childRunner = createChildRunner(true);

            // Timer started at 0, duration 60000ms, now at 57000ms (3s remaining < 5s min)
            const ctx = createMockContext({
                childRunner,
                timerState: createCountdownTimer(0, 60000),
                clockNow: 57000
            });

            const actions = behavior.onNext(ctx);
            expect(actions).toEqual([]);
        });

        it('should push rest block when all children executed and timer has remaining time', () => {
            const behavior = new RestBlockBehavior();
            const childRunner = createChildRunner(true);

            // Timer started at 0, duration 60000ms, now at 30000ms (30s remaining)
            const ctx = createMockContext({
                childRunner,
                timerState: createCountdownTimer(0, 60000),
                clockNow: 30000
            });

            const actions = behavior.onNext(ctx);
            expect(actions.length).toBe(1);
            expect(actions[0].type).toBe('push-rest-block');
            expect(behavior.isRestPending).toBe(true);
        });

        it('should set correct duration on push-rest-block action', () => {
            const behavior = new RestBlockBehavior({ label: 'Recovery' });
            const childRunner = createChildRunner(true);

            // Timer started at 0, duration 60000ms, now at 45000ms (15s remaining)
            const ctx = createMockContext({
                childRunner,
                timerState: createCountdownTimer(0, 60000),
                clockNow: 45000
            });

            const actions = behavior.onNext(ctx);
            expect(actions.length).toBe(1);
            expect(actions[0].payload).toEqual({ durationMs: 15000, label: 'Recovery' });
        });
    });

    describe('onNext - rest completion flow', () => {
        it('should clear isRestPending when rest block completes', () => {
            const behavior = new RestBlockBehavior();
            const childRunner = createChildRunner(true);

            // First call: push rest block
            const ctx1 = createMockContext({
                childRunner,
                timerState: createCountdownTimer(0, 60000),
                clockNow: 30000
            });
            behavior.onNext(ctx1);
            expect(behavior.isRestPending).toBe(true);

            // Second call: rest block completed (parent.next() called again)
            const ctx2 = createMockContext({
                childRunner,
                timerState: createCountdownTimer(0, 60000),
                clockNow: 60000
            });
            const actions = behavior.onNext(ctx2);
            expect(actions).toEqual([]);
            expect(behavior.isRestPending).toBe(false);
        });

        it('should not push rest again after rest completion in same cycle', () => {
            const behavior = new RestBlockBehavior();
            const childRunner = createChildRunner(true);

            // First call: push rest
            const ctx1 = createMockContext({
                childRunner,
                timerState: createCountdownTimer(0, 60000),
                clockNow: 30000
            });
            behavior.onNext(ctx1);

            // Second call: rest completed
            const ctx2 = createMockContext({
                childRunner,
                timerState: createCountdownTimer(0, 60000),
                clockNow: 60000 // timer now expired
            });
            const actions = behavior.onNext(ctx2);
            expect(actions).toEqual([]); // Should not push another rest
        });
    });

    describe('onUnmount', () => {
        it('should return no actions on unmount', () => {
            const behavior = new RestBlockBehavior();
            const ctx = createMockContext();
            const actions = behavior.onUnmount(ctx);
            expect(actions).toEqual([]);
        });
    });

    describe('onDispose', () => {
        it('should reset isRestPending on dispose', () => {
            const behavior = new RestBlockBehavior();
            const childRunner = createChildRunner(true);

            // Push rest
            const ctx = createMockContext({
                childRunner,
                timerState: createCountdownTimer(0, 60000),
                clockNow: 30000
            });
            behavior.onNext(ctx);
            expect(behavior.isRestPending).toBe(true);

            // Dispose
            behavior.onDispose(ctx);
            expect(behavior.isRestPending).toBe(false);
        });
    });

    describe('timer calculation with paused spans', () => {
        it('should handle paused timer spans correctly', () => {
            const behavior = new RestBlockBehavior();
            const childRunner = createChildRunner(true);

            // Timer with a pause: ran 0-10000, paused, resumed at 15000
            const timerState: TimerState = {
                direction: 'down',
                durationMs: 60000,
                spans: [
                    new TimeSpan(0, 10000),    // 10s active
                    new TimeSpan(15000)         // resumed at 15s, still open
                ],
                label: 'Interval',
                role: 'primary'
            };

            // Now at 25000: elapsed = 10000 (first span) + (25000-15000) = 20000ms
            // Remaining = 60000 - 20000 = 40000ms
            const ctx = createMockContext({
                childRunner,
                timerState,
                clockNow: 25000
            });

            const actions = behavior.onNext(ctx);
            expect(actions.length).toBe(1);
            expect(actions[0].payload).toEqual({ durationMs: 40000, label: 'Rest' });
        });
    });
});
