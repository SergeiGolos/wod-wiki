import { describe, it, expect, vi } from 'bun:test';
import { SegmentOutputBehavior } from '../SegmentOutputBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { FragmentType } from '../../../core/models/CodeFragment';

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
        pushMemory: vi.fn(),
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

        it('should include elapsed and spans fragments for non-timer blocks', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext();

            behavior.onUnmount(ctx);

            const emittedFragments = (ctx.emitOutput as any).mock.calls[0][1];
            const hasElapsed = emittedFragments.some((f: any) => f.fragmentType === 'elapsed');
            const hasSpans = emittedFragments.some((f: any) => f.fragmentType === 'spans');
            const hasTotal = emittedFragments.some((f: any) => f.fragmentType === 'total');
            const hasSystemTime = emittedFragments.some((f: any) => f.fragmentType === 'system-time');
            expect(hasElapsed).toBe(true);
            expect(hasSpans).toBe(true);
            expect(hasTotal).toBe(true);
            expect(hasSystemTime).toBe(true);
        });

        it('should create degenerate span for non-timer blocks', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext();

            behavior.onUnmount(ctx);

            const emittedFragments = (ctx.emitOutput as any).mock.calls[0][1];
            const spansFrag = emittedFragments.find((f: any) => f.fragmentType === 'spans');
            expect(spansFrag).toBeDefined();
            expect(spansFrag.spans.length).toBe(1);
            expect(spansFrag.spans[0].started).toBe(spansFrag.spans[0].ended);
        });

        it('should write to fragment:result memory', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext();

            behavior.onUnmount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith(
                'fragment:result',
                expect.any(Array)
            );
        });

        it('should return no actions on unmount', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext();

            const actions = behavior.onUnmount(ctx);

            expect(actions).toEqual([]);
        });
    });

    describe('segment + completion output lifecycle', () => {
        it('should emit segment on mount and completion on unmount', () => {
            const behavior = new SegmentOutputBehavior({ label: 'Workout' });
            const ctx = createMockContext();

            behavior.onMount(ctx);
            behavior.onUnmount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledTimes(2);
            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'segment', expect.any(Array), expect.objectContaining({ label: 'Workout' })
            );
            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'completion', expect.any(Array), expect.objectContaining({ label: 'Workout' })
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
            const timerFragments = emittedFragments.filter((f: any) => f.type === 'timer');
            expect(timerFragments).toHaveLength(1);
            expect(timerFragments[0].origin).toBe('parser');
        });
    });
});
