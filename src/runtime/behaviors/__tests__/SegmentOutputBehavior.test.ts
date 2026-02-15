import { describe, it, expect, vi } from 'bun:test';
import { SegmentOutputBehavior } from '../SegmentOutputBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { FragmentType } from '../../../core/models/CodeFragment';
import { TimerState } from '../../memory/MemoryTypes';

function createMockContext(overrides: Partial<IBehaviorContext> = {}): IBehaviorContext {
    const memoryStore = new Map<string, any>();

    return {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Default Label',
            fragments: [],
            completionReason: undefined,
            executionTiming: undefined,
            getMemoryByTag: () => [],
        },
        clock: { now: new Date(1000) },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((type: string) => memoryStore.get(type)),
        setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value)),
        ...overrides
    } as unknown as IBehaviorContext;
}

describe('SegmentOutputBehavior', () => {
    describe('onMount', () => {
        it('should emit segment output on mount', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext();

            behavior.onMount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'segment',
                expect.any(Array),
                expect.objectContaining({ label: 'Default Label' })
            );
        });

        it('should use custom label when provided', () => {
            const behavior = new SegmentOutputBehavior({ label: 'My Workout' });
            const ctx = createMockContext();

            behavior.onMount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'segment',
                expect.any(Array),
                expect.objectContaining({ label: 'My Workout' })
            );
        });

        it('should fall back to block label when no custom label', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext();

            behavior.onMount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'segment',
                expect.any(Array),
                expect.objectContaining({ label: 'Default Label' })
            );
        });
    });

    describe('onNext', () => {
        it('should return no actions on next', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext();
            const actions = behavior.onNext(ctx);
            expect(actions).toEqual([]);
        });

        it('should not emit any output on next', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext();
            behavior.onNext(ctx);
            expect(ctx.emitOutput).not.toHaveBeenCalled();
        });
    });

    describe('onUnmount', () => {
        it('should emit completion output on unmount', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext();

            behavior.onUnmount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'completion',
                expect.any(Array),
                expect.objectContaining({ label: 'Default Label' })
            );
        });

        it('should use custom label on unmount', () => {
            const behavior = new SegmentOutputBehavior({ label: 'Session Done' });
            const ctx = createMockContext();

            behavior.onUnmount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'completion',
                expect.any(Array),
                expect.objectContaining({ label: 'Session Done' })
            );
        });
    });

    describe('paired output', () => {
        it('should emit segment on mount and completion on unmount', () => {
            const behavior = new SegmentOutputBehavior({ label: 'Workout' });
            const ctx = createMockContext();

            behavior.onMount(ctx);
            behavior.onUnmount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledTimes(2);
            expect(ctx.emitOutput).toHaveBeenNthCalledWith(1,
                'segment', expect.any(Array), expect.objectContaining({ label: 'Workout' })
            );
            expect(ctx.emitOutput).toHaveBeenNthCalledWith(2,
                'completion', expect.any(Array), expect.objectContaining({ label: 'Workout' })
            );
        });
    });

    describe('completionReason propagation (S1)', () => {
        it('should include user-advance completionReason on self-pop unmount', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext({
                block: {
                    key: { toString: () => 'test-block' },
                    label: 'Push-ups',
                    fragments: [],
                    completionReason: 'user-advance',
                    getMemoryByTag: () => [],
                } as any,
            });

            behavior.onUnmount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'completion',
                expect.any(Array),
                expect.objectContaining({ completionReason: 'user-advance' })
            );
        });

        it('should include forced-pop completionReason on parent-pop unmount', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext({
                block: {
                    key: { toString: () => 'test-block' },
                    label: 'Effort Block',
                    fragments: [],
                    completionReason: 'forced-pop',
                    getMemoryByTag: () => [],
                } as any,
            });

            behavior.onUnmount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'completion',
                expect.any(Array),
                expect.objectContaining({ completionReason: 'forced-pop' })
            );
        });

        it('should pass undefined completionReason when block has no reason', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext();

            behavior.onUnmount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'completion',
                expect.any(Array),
                expect.objectContaining({ completionReason: undefined })
            );
        });
    });

    describe('container state identity on mount (S3)', () => {
        it('should include round fragments in segment output on mount', () => {
            const roundFragment = {
                fragmentType: FragmentType.Rounds,
                type: 'rounds',
                image: 'Round 1 / 3',
                origin: 'runtime' as const,
                value: { current: 1, total: 3 },
                sourceBlockKey: 'test-block',
                timestamp: new Date(1000),
            };

            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext({
                block: {
                    key: { toString: () => 'test-block' },
                    label: '3 Rounds',
                    fragments: [],
                    completionReason: undefined,
                    getMemoryByTag: (tag: string) => {
                        if (tag === 'round') return [{ tag: 'round', fragments: [roundFragment] }];
                        return [];
                    },
                } as any,
            });

            behavior.onMount(ctx);

            const emittedFragments = (ctx.emitOutput as any).mock.calls[0][1];
            expect(emittedFragments).toContainEqual(expect.objectContaining({
                fragmentType: FragmentType.Rounds,
                type: 'rounds',
                value: { current: 1, total: 3 },
            }));
        });

        it('should include timer fragments in segment output on mount', () => {
            const timerFragment = {
                fragmentType: FragmentType.Timer,
                type: 'timer',
                image: '20:00',
                origin: 'runtime' as const,
                value: { direction: 'down', durationMs: 1200000 },
                sourceBlockKey: 'test-block',
                timestamp: new Date(1000),
            };

            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext({
                block: {
                    key: { toString: () => 'test-block' },
                    label: 'Countdown',
                    fragments: [],
                    completionReason: undefined,
                    getMemoryByTag: (tag: string) => {
                        if (tag === 'timer') return [{ tag: 'timer', fragments: [timerFragment] }];
                        return [];
                    },
                } as any,
            });

            behavior.onMount(ctx);

            const emittedFragments = (ctx.emitOutput as any).mock.calls[0][1];
            expect(emittedFragments).toContainEqual(expect.objectContaining({
                fragmentType: FragmentType.Timer,
                type: 'timer',
            }));
        });

        it('should merge display and runtime state fragments on mount', () => {
            const displayFragment = {
                fragmentType: FragmentType.Label,
                type: 'label',
                image: 'AMRAP',
                origin: 'parser' as const,
                value: undefined,
            };
            const roundFragment = {
                fragmentType: FragmentType.Rounds,
                type: 'rounds',
                image: 'Round 1 / 5',
                origin: 'runtime' as const,
                value: { current: 1, total: 5 },
                sourceBlockKey: 'test-block',
                timestamp: new Date(1000),
            };
            const timerFragment = {
                fragmentType: FragmentType.Timer,
                type: 'timer',
                image: '10:00',
                origin: 'runtime' as const,
                value: { direction: 'down', durationMs: 600000 },
                sourceBlockKey: 'test-block',
                timestamp: new Date(1000),
            };

            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext({
                block: {
                    key: { toString: () => 'test-block' },
                    label: 'AMRAP 10',
                    fragments: [],
                    completionReason: undefined,
                    getMemoryByTag: (tag: string) => {
                        if (tag === 'fragment:display') return [{ tag: 'fragment:display', fragments: [displayFragment] }];
                        if (tag === 'round') return [{ tag: 'round', fragments: [roundFragment] }];
                        if (tag === 'timer') return [{ tag: 'timer', fragments: [timerFragment] }];
                        return [];
                    },
                } as any,
            });

            behavior.onMount(ctx);

            const emittedFragments = (ctx.emitOutput as any).mock.calls[0][1];
            expect(emittedFragments).toHaveLength(3);
            expect(emittedFragments).toContainEqual(expect.objectContaining({ type: 'label' }));
            expect(emittedFragments).toContainEqual(expect.objectContaining({ type: 'rounds' }));
            expect(emittedFragments).toContainEqual(expect.objectContaining({ type: 'timer' }));
        });

        it('should deduplicate fragments already in display when merging state', () => {
            // If fragment:display already has a timer fragment (from parser),
            // the runtime timer fragment should not be duplicated
            const parserTimerFragment = {
                fragmentType: FragmentType.Timer,
                type: 'timer',
                image: '20:00',
                origin: 'parser' as const,
                value: 1200000,
            };
            const runtimeTimerFragment = {
                fragmentType: FragmentType.Timer,
                type: 'timer',
                image: '20:00',
                origin: 'runtime' as const,
                value: { direction: 'down', durationMs: 1200000 },
                sourceBlockKey: 'test-block',
                timestamp: new Date(1000),
            };

            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext({
                block: {
                    key: { toString: () => 'test-block' },
                    label: 'Countdown',
                    fragments: [],
                    completionReason: undefined,
                    getMemoryByTag: (tag: string) => {
                        if (tag === 'fragment:display') return [{ tag: 'fragment:display', fragments: [parserTimerFragment] }];
                        if (tag === 'timer') return [{ tag: 'timer', fragments: [runtimeTimerFragment] }];
                        return [];
                    },
                } as any,
            });

            behavior.onMount(ctx);

            const emittedFragments = (ctx.emitOutput as any).mock.calls[0][1];
            // Should have only the parser fragment, not the runtime duplicate
            const timerFragments = emittedFragments.filter((f: any) => f.type === 'timer');
            expect(timerFragments).toHaveLength(1);
            expect(timerFragments[0].origin).toBe('parser');
        });

        it('should not include runtime state fragments in completion output', () => {
            const roundFragment = {
                fragmentType: FragmentType.Rounds,
                type: 'rounds',
                image: 'Round 3 / 3',
                origin: 'runtime' as const,
                value: { current: 3, total: 3 },
                sourceBlockKey: 'test-block',
                timestamp: new Date(1000),
            };

            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext({
                block: {
                    key: { toString: () => 'test-block' },
                    label: '3 Rounds',
                    fragments: [],
                    completionReason: 'rounds-complete',
                    executionTiming: undefined,
                    getMemoryByTag: (tag: string) => {
                        if (tag === 'round') return [{ tag: 'round', fragments: [roundFragment] }];
                        return [];
                    },
                } as any,
            });

            behavior.onUnmount(ctx);

            // Completion output uses getFragments() which only reads fragment:display.
            // The only fragment present should be the SystemTimeFragment added automatically.
            const emittedFragments = (ctx.emitOutput as any).mock.calls[0][1];
            expect(emittedFragments).toHaveLength(1);
            expect(emittedFragments[0].fragmentType).toBe(FragmentType.SystemTime);
        });
    });

    describe('elapsed time in completion output (S5)', () => {
        it('should include elapsed duration from timer spans on unmount', () => {
            const timerState: TimerState = {
                direction: 'down',
                durationMs: 10000,
                label: 'Countdown',
                spans: [{ started: 0, ended: 7500 }],
            };
            const memoryStore = new Map<string, any>([['timer', timerState]]);

            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext({
                block: {
                    key: { toString: () => 'test-block' },
                    label: 'Timer Block',
                    fragments: [],
                    completionReason: 'timer-expired',
                    executionTiming: undefined,
                    getMemoryByTag: () => [],
                } as any,
                clock: { now: new Date(7500) },
                getMemory: vi.fn((type: string) => memoryStore.get(type)),
                setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value)),
            });

            behavior.onUnmount(ctx);

            const emittedFragments = (ctx.emitOutput as any).mock.calls[0][1];
            const elapsedFragments = emittedFragments.filter((f: any) =>
                f.fragmentType === FragmentType.Elapsed && f.type === 'elapsed'
            );
            expect(elapsedFragments).toHaveLength(1);
            expect(elapsedFragments[0].value).toBe(7500);
            expect(elapsedFragments[0].origin).toBe('collected');
            expect(elapsedFragments[0].image).toBe('0:07');
        });

        it('should include elapsed duration from timer with multiple spans (pause-aware)', () => {
            const timerState: TimerState = {
                direction: 'up',
                label: 'For Time',
                spans: [
                    { started: 0, ended: 3000 },    // 3s active
                    { started: 8000, ended: 11000 }, // 3s active (5s paused)
                ],
            };
            const memoryStore = new Map<string, any>([['timer', timerState]]);

            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext({
                block: {
                    key: { toString: () => 'test-block' },
                    label: 'Effort',
                    fragments: [],
                    completionReason: 'user-advance',
                    executionTiming: undefined,
                    getMemoryByTag: () => [],
                } as any,
                clock: { now: new Date(11000) },
                getMemory: vi.fn((type: string) => memoryStore.get(type)),
                setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value)),
            });

            behavior.onUnmount(ctx);

            const emittedFragments = (ctx.emitOutput as any).mock.calls[0][1];
            const elapsedFragments = emittedFragments.filter((f: any) =>
                f.fragmentType === FragmentType.Elapsed && f.type === 'elapsed'
            );
            expect(elapsedFragments).toHaveLength(1);
            // 3000 + 3000 = 6000ms pause-aware elapsed
            expect(elapsedFragments[0].value).toBe(6000);
        });

        it('should compute wall-clock elapsed for non-timer blocks via executionTiming', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext({
                block: {
                    key: { toString: () => 'test-block' },
                    label: 'Pushups',
                    fragments: [],
                    completionReason: 'user-advance',
                    executionTiming: {
                        startTime: new Date(1000),
                        completedAt: new Date(31000),
                    },
                    getMemoryByTag: () => [],
                } as any,
                clock: { now: new Date(31000) },
            });

            behavior.onUnmount(ctx);

            const emittedFragments = (ctx.emitOutput as any).mock.calls[0][1];
            const elapsedFragments = emittedFragments.filter((f: any) =>
                f.fragmentType === FragmentType.Elapsed && f.type === 'elapsed'
            );
            expect(elapsedFragments).toHaveLength(1);
            expect(elapsedFragments[0].value).toBe(30000); // 31000 - 1000
            expect(elapsedFragments[0].origin).toBe('collected');
        });

        it('should use clock.now as fallback when completedAt is not set', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext({
                block: {
                    key: { toString: () => 'test-block' },
                    label: 'Effort',
                    fragments: [],
                    completionReason: undefined,
                    executionTiming: {
                        startTime: new Date(5000),
                    },
                    getMemoryByTag: () => [],
                } as any,
                clock: { now: new Date(15000) },
            });

            behavior.onUnmount(ctx);

            const emittedFragments = (ctx.emitOutput as any).mock.calls[0][1];
            const elapsedFragments = emittedFragments.filter((f: any) =>
                f.fragmentType === FragmentType.Elapsed && f.type === 'elapsed'
            );
            expect(elapsedFragments).toHaveLength(1);
            expect(elapsedFragments[0].value).toBe(10000); // 15000 - 5000
        });

        it('should not duplicate elapsed if tracked fragment already has duration', () => {
            const timerState: TimerState = {
                direction: 'down',
                durationMs: 10000,
                label: 'Timer',
                spans: [{ started: 0, ended: 5000 }],
            };
            const trackedDurationFragment = {
                fragmentType: FragmentType.Elapsed,
                type: 'elapsed',
                image: '0:05',
                origin: 'collected' as const,
                value: 5000,
            };
            const memoryStore = new Map<string, any>([['timer', timerState]]);

            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext({
                block: {
                    key: { toString: () => 'test-block' },
                    label: 'Timer',
                    fragments: [],
                    completionReason: 'timer-expired',
                    executionTiming: undefined,
                    getMemoryByTag: (tag: string) => {
                        if (tag === 'fragment:tracked') return [{ tag: 'fragment:tracked', fragments: [trackedDurationFragment] }];
                        return [];
                    },
                } as any,
                clock: { now: new Date(5000) },
                getMemory: vi.fn((type: string) => memoryStore.get(type)),
                setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value)),
            });

            behavior.onUnmount(ctx);

            const emittedFragments = (ctx.emitOutput as any).mock.calls[0][1];
            const elapsedFragments = emittedFragments.filter((f: any) =>
                f.fragmentType === FragmentType.Elapsed && f.type === 'elapsed'
            );
            // Should only have the tracked fragment, not a duplicate from getElapsedFragment
            expect(elapsedFragments).toHaveLength(1);
        });

        it('should not include elapsed when no timer and no executionTiming', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext({
                block: {
                    key: { toString: () => 'test-block' },
                    label: 'Block',
                    fragments: [],
                    completionReason: undefined,
                    executionTiming: undefined,
                    getMemoryByTag: () => [],
                } as any,
            });

            behavior.onUnmount(ctx);

            const emittedFragments = (ctx.emitOutput as any).mock.calls[0][1];
            const elapsedFragments = emittedFragments.filter((f: any) =>
                f.fragmentType === FragmentType.Elapsed && f.type === 'elapsed'
            );
            expect(elapsedFragments).toHaveLength(0);
        });

        it('should prefer timer spans over executionTiming when both exist', () => {
            const timerState: TimerState = {
                direction: 'up',
                label: 'Timer',
                spans: [
                    { started: 1000, ended: 4000 },   // 3s
                    { started: 6000, ended: 8000 },    // 2s (paused 2s)
                ],
            };
            const memoryStore = new Map<string, any>([['timer', timerState]]);

            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext({
                block: {
                    key: { toString: () => 'test-block' },
                    label: 'Timer',
                    fragments: [],
                    completionReason: 'user-advance',
                    executionTiming: {
                        startTime: new Date(1000),
                        completedAt: new Date(8000),
                    },
                    getMemoryByTag: () => [],
                } as any,
                clock: { now: new Date(8000) },
                getMemory: vi.fn((type: string) => memoryStore.get(type)),
                setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value)),
            });

            behavior.onUnmount(ctx);

            const emittedFragments = (ctx.emitOutput as any).mock.calls[0][1];
            const elapsedFragments = emittedFragments.filter((f: any) =>
                f.fragmentType === FragmentType.Elapsed && f.type === 'elapsed'
            );
            expect(elapsedFragments).toHaveLength(1);
            // Should use timer spans (5000ms) not wall-clock (7000ms)
            expect(elapsedFragments[0].value).toBe(5000);
        });
    });
});
