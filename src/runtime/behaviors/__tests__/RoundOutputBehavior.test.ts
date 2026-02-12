import { describe, it, expect, vi } from 'bun:test';
import { RoundOutputBehavior } from '../RoundOutputBehavior';
import { ChildRunnerBehavior } from '../ChildRunnerBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { FragmentType } from '../../../core/models/CodeFragment';
import { RoundState, TimerState } from '../../memory/MemoryTypes';
import { TimeSpan } from '../../models/TimeSpan';

function createMockContext(overrides: Partial<IBehaviorContext> = {}): IBehaviorContext {
    const memoryStore = new Map<string, any>();

    return {
        block: {
            key: { toString: () => 'loop-block' },
            label: 'Loop',
            fragments: [],
            completionReason: undefined,
            getMemoryByTag: () => [],
            getBehavior: () => undefined,
        },
        clock: { now: new Date(1000) },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((type: string) => memoryStore.get(type)),
        setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value)),
        ...overrides,
    } as unknown as IBehaviorContext;
}

function withMemory(entries: Record<string, any>): Partial<IBehaviorContext> {
    const memoryStore = new Map<string, any>(Object.entries(entries));
    return {
        getMemory: vi.fn((type: string) => memoryStore.get(type)),
        setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value)),
    };
}

function withRoundState(round: RoundState): Partial<IBehaviorContext> {
    return withMemory({ round });
}

function withRoundAndTimer(round: RoundState, timer: TimerState): Partial<IBehaviorContext> {
    return withMemory({ round, timer });
}

describe('RoundOutputBehavior', () => {
    describe('onMount (S4 — initial round milestone)', () => {
        it('should emit milestone with initial round state on mount', () => {
            const behavior = new RoundOutputBehavior();
            const ctx = createMockContext(withRoundState({ current: 1, total: 3 }));

            behavior.onMount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'milestone',
                [expect.objectContaining({
                    type: 'count',
                    fragmentType: FragmentType.Rounds,
                    value: 1,
                    image: 'Round 1 of 3',
                    origin: 'runtime',
                })],
                expect.objectContaining({ label: 'Round 1 of 3' })
            );
        });

        it('should emit milestone for unbounded rounds (no total)', () => {
            const behavior = new RoundOutputBehavior();
            const ctx = createMockContext(withRoundState({ current: 1, total: undefined }));

            behavior.onMount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'milestone',
                [expect.objectContaining({
                    type: 'count',
                    fragmentType: FragmentType.Rounds,
                    value: 1,
                    image: 'Round 1',
                    origin: 'runtime',
                })],
                expect.objectContaining({ label: 'Round 1' })
            );
        });

        it('should not emit milestone when no round state exists', () => {
            const behavior = new RoundOutputBehavior();
            const ctx = createMockContext();

            behavior.onMount(ctx);

            expect(ctx.emitOutput).not.toHaveBeenCalled();
        });

        it('should return empty actions array on mount', () => {
            const behavior = new RoundOutputBehavior();
            const ctx = createMockContext(withRoundState({ current: 1, total: 5 }));

            const actions = behavior.onMount(ctx);

            expect(actions).toEqual([]);
        });
    });

    describe('onNext (round advance milestone)', () => {
        it('should emit milestone with advanced round state', () => {
            const behavior = new RoundOutputBehavior();
            const ctx = createMockContext(withRoundState({ current: 2, total: 3 }));

            behavior.onNext(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'milestone',
                [expect.objectContaining({
                    type: 'count',
                    fragmentType: FragmentType.Rounds,
                    value: 2,
                    image: 'Round 2 of 3',
                    origin: 'runtime',
                })],
                expect.objectContaining({ label: 'Round 2 of 3' })
            );
        });

        it('should not emit milestone when no round state exists', () => {
            const behavior = new RoundOutputBehavior();
            const ctx = createMockContext();

            behavior.onNext(ctx);

            expect(ctx.emitOutput).not.toHaveBeenCalled();
        });
    });

    describe('deduplication — only emit at round boundaries', () => {
        function createChildRunner(allCompleted: boolean) {
            return { allChildrenCompleted: allCompleted } as unknown as ChildRunnerBehavior;
        }

        function createCtxWithChildren(
            round: RoundState,
            childRunner: ChildRunnerBehavior
        ): IBehaviorContext {
            const memoryStore = new Map<string, any>([['round', round]]);
            return createMockContext({
                block: {
                    key: { toString: () => 'loop-block' },
                    label: 'Loop',
                    fragments: [],
                    completionReason: undefined,
                    getMemoryByTag: () => [],
                    getBehavior: (ctor: any) =>
                        ctor === ChildRunnerBehavior ? childRunner : undefined,
                } as any,
                getMemory: vi.fn((type: string) => memoryStore.get(type)),
                setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value)),
            });
        }

        it('should NOT emit on onNext when children are still in progress', () => {
            const behavior = new RoundOutputBehavior();
            const childRunner = createChildRunner(false);
            const ctx = createCtxWithChildren({ current: 1, total: 3 }, childRunner);

            behavior.onNext(ctx);

            expect(ctx.emitOutput).not.toHaveBeenCalled();
        });

        it('should emit on onNext when all children have completed', () => {
            const behavior = new RoundOutputBehavior();
            const childRunner = createChildRunner(true);
            const ctx = createCtxWithChildren({ current: 2, total: 3 }, childRunner);

            behavior.onNext(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'milestone',
                [expect.objectContaining({ value: 2, image: 'Round 2 of 3' })],
                expect.objectContaining({ label: 'Round 2 of 3' })
            );
        });

        it('should emit on onNext for blocks without children (no ChildRunnerBehavior)', () => {
            const behavior = new RoundOutputBehavior();
            // Default mock has getBehavior returning undefined → no child runner
            const ctx = createMockContext(withRoundState({ current: 2, total: 5 }));

            behavior.onNext(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledTimes(1);
        });
    });

    describe('onUnmount', () => {
        it('should not emit any output on unmount', () => {
            const behavior = new RoundOutputBehavior();
            const ctx = createMockContext(withRoundState({ current: 3, total: 3 }));

            behavior.onUnmount(ctx);

            expect(ctx.emitOutput).not.toHaveBeenCalled();
        });

        it('should return empty actions array on unmount', () => {
            const behavior = new RoundOutputBehavior();
            const ctx = createMockContext();

            const actions = behavior.onUnmount(ctx);

            expect(actions).toEqual([]);
        });
    });

    describe('lifecycle pairing — mount and next milestones', () => {
        it('should emit milestone on mount AND on next (no gap in round coverage)', () => {
            const behavior = new RoundOutputBehavior();
            const memoryStore = new Map<string, any>([
                ['round', { current: 1, total: 3 } as RoundState]
            ]);
            // Simulate a container with children — allChildrenCompleted is true
            // at the round boundary (when RoundAdvanceBehavior has already advanced)
            const childRunner = { allChildrenCompleted: true } as unknown as ChildRunnerBehavior;

            const ctx = createMockContext({
                block: {
                    key: { toString: () => 'loop-block' },
                    label: 'Loop',
                    fragments: [],
                    completionReason: undefined,
                    getMemoryByTag: () => [],
                    getBehavior: (ctor: any) =>
                        ctor === ChildRunnerBehavior ? childRunner : undefined,
                } as any,
                getMemory: vi.fn((type: string) => memoryStore.get(type)),
                setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value)),
            });

            // Mount: initial round
            behavior.onMount(ctx);
            expect(ctx.emitOutput).toHaveBeenCalledTimes(1);
            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'milestone',
                [expect.objectContaining({ value: 1, image: 'Round 1 of 3' })],
                expect.objectContaining({ label: 'Round 1 of 3' })
            );

            // Simulate round advance
            memoryStore.set('round', { current: 2, total: 3 } as RoundState);

            // Next: round 2 milestone (allChildrenCompleted = true → emit)
            behavior.onNext(ctx);
            expect(ctx.emitOutput).toHaveBeenCalledTimes(2);
            expect(ctx.emitOutput).toHaveBeenLastCalledWith(
                'milestone',
                [expect.objectContaining({ value: 2, image: 'Round 2 of 3' })],
                expect.objectContaining({ label: 'Round 2 of 3' })
            );
        });
    });

    describe('S8 — timer state in milestones', () => {
        it('should include timer fragment in milestone when timer memory exists (mount)', () => {
            const behavior = new RoundOutputBehavior();
            const timer: TimerState = {
                spans: [new TimeSpan(0)],
                direction: 'down',
                durationMs: 60000,
                label: 'Interval',
                role: 'primary'
            };
            const ctx = createMockContext(withRoundAndTimer(
                { current: 1, total: 10 },
                timer
            ));

            behavior.onMount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'milestone',
                [
                    expect.objectContaining({
                        type: 'count',
                        fragmentType: FragmentType.Rounds,
                        value: 1,
                    }),
                    expect.objectContaining({
                        type: 'timer',
                        fragmentType: FragmentType.Timer,
                        origin: 'runtime',
                    })
                ],
                expect.objectContaining({ label: 'Round 1 of 10' })
            );
        });

        it('should include timer fragment in milestone on next (round advance)', () => {
            const behavior = new RoundOutputBehavior();
            const timer: TimerState = {
                spans: [new TimeSpan(0)],
                direction: 'down',
                durationMs: 60000,
                label: 'Interval',
                role: 'primary'
            };
            const ctx = createMockContext(withRoundAndTimer(
                { current: 2, total: 5 },
                timer
            ));

            behavior.onNext(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'milestone',
                [
                    expect.objectContaining({
                        type: 'count',
                        fragmentType: FragmentType.Rounds,
                        value: 2,
                    }),
                    expect.objectContaining({
                        type: 'timer',
                        fragmentType: FragmentType.Timer,
                        origin: 'runtime',
                    })
                ],
                expect.objectContaining({ label: 'Round 2 of 5' })
            );
        });

        it('should reflect timer reset in EMOM milestone (near-zero elapsed after reset)', () => {
            const behavior = new RoundOutputBehavior();
            // Simulate timer that was just reset — fresh span starting at now (1000)
            const timer: TimerState = {
                spans: [new TimeSpan(1000)],  // Just started, matches clock.now
                direction: 'down',
                durationMs: 60000,
                label: 'Interval',
            };
            const ctx = createMockContext(withRoundAndTimer(
                { current: 2, total: 10 },
                timer
            ));

            behavior.onNext(ctx);

            const emitCall = (ctx.emitOutput as any).mock.calls[0];
            const fragments = emitCall[1];
            const timerFrag = fragments.find((f: any) => f.fragmentType === FragmentType.Timer);

            expect(timerFrag).toBeDefined();
            // Elapsed should be ~0 because span started at clock.now (1000ms)
            expect(timerFrag.value).toBe(0);
            // Image shows the interval duration, not elapsed
            expect(timerFrag.image).toBe('1:00');
        });

        it('should show cumulative elapsed for AMRAP timer (no reset)', () => {
            const behavior = new RoundOutputBehavior();
            // Timer running for 120 seconds total
            const timer: TimerState = {
                spans: [new TimeSpan(0)],  // Started at 0, clock is at 1000ms
                direction: 'down',
                durationMs: 600000,  // 10 min AMRAP
                label: 'AMRAP',
            };
            const ctx = createMockContext({
                ...withRoundAndTimer(
                    { current: 3, total: undefined },
                    timer
                ),
                clock: { now: new Date(120000) },  // 2 minutes in
            } as any);

            behavior.onNext(ctx);

            const emitCall = (ctx.emitOutput as any).mock.calls[0];
            const fragments = emitCall[1];
            const timerFrag = fragments.find((f: any) => f.fragmentType === FragmentType.Timer);

            expect(timerFrag).toBeDefined();
            // Elapsed = 120000ms (2 minutes of running)
            expect(timerFrag.value).toBe(120000);
        });

        it('should not include timer fragment when no timer memory exists', () => {
            const behavior = new RoundOutputBehavior();
            // Round-only block (GenericLoopStrategy), no timer
            const ctx = createMockContext(withRoundState({ current: 1, total: 3 }));

            behavior.onMount(ctx);

            const emitCall = (ctx.emitOutput as any).mock.calls[0];
            const fragments = emitCall[1];

            // Should have only the round fragment
            expect(fragments).toHaveLength(1);
            expect(fragments[0].fragmentType).toBe(FragmentType.Rounds);
        });

        it('should handle pause-aware elapsed in timer fragment', () => {
            const behavior = new RoundOutputBehavior();
            // Timer with a completed span (paused) and a current span
            const span1 = new TimeSpan(0);
            (span1 as any).ended = 5000;  // 5 seconds
            const span2 = new TimeSpan(8000);  // Resumed at 8s, clock at 10s → 2 more seconds

            const timer: TimerState = {
                spans: [span1, span2],
                direction: 'down',
                durationMs: 60000,
                label: 'Interval',
            };
            const ctx = createMockContext({
                ...withRoundAndTimer(
                    { current: 1, total: 5 },
                    timer
                ),
                clock: { now: new Date(10000) },
            } as any);

            behavior.onMount(ctx);

            const emitCall = (ctx.emitOutput as any).mock.calls[0];
            const fragments = emitCall[1];
            const timerFrag = fragments.find((f: any) => f.fragmentType === FragmentType.Timer);

            // Elapsed = 5000 (span1) + 2000 (span2 open, 10000-8000) = 7000ms
            expect(timerFrag.value).toBe(7000);
        });
    });
});
