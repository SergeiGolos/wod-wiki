import { describe, it, expect, vi } from 'bun:test';
import { ReportOutputBehavior } from '../ReportOutputBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { FragmentType } from '../../../core/models/CodeFragment';
import { RoundState, TimerState } from '../../memory/MemoryTypes';
import { TimeSpan } from '../../models/TimeSpan';

interface MockContextOptions {
    memory?: Record<string, unknown>;
    tagFragments?: Record<string, any[]>;
    label?: string;
}

function createMockContext(options: MockContextOptions = {}): IBehaviorContext {
    const memoryStore = new Map<string, unknown>(Object.entries(options.memory ?? {}));
    const tagStore = new Map<string, any[]>(Object.entries(options.tagFragments ?? {}));

    const pushMemory = vi.fn((tag: string, fragments: any[]) => {
        tagStore.set(tag, fragments);
        return { tag, fragments, update: vi.fn(), subscribe: vi.fn(), dispose: vi.fn() } as any;
    });

    const updateMemory = vi.fn((tag: string, fragments: any[]) => {
        tagStore.set(tag, fragments);
    });

    return {
        block: {
            key: { toString: () => 'test-block' },
            label: options.label ?? 'Default Label',
            fragments: [],
            completionReason: undefined,
            getMemoryByTag: (tag: string) => {
                const fragments = tagStore.get(tag) ?? [];
                if (fragments.length === 0) return [];
                return [{ tag, fragments } as any];
            },
        },
        clock: { now: new Date(1000) },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        pushMemory,
        updateMemory,
        markComplete: vi.fn(),
        getMemory: vi.fn((type: string) => memoryStore.get(type)),
        setMemory: vi.fn((type: string, value: unknown) => memoryStore.set(type, value)),
    } as unknown as IBehaviorContext;
}

describe('ReportOutputBehavior', () => {
    it('does not emit segment output on mount by default', () => {
        const behavior = new ReportOutputBehavior();
        const ctx = createMockContext();

        behavior.onMount(ctx);

        const segmentCalls = (ctx.emitOutput as any).mock.calls.filter((call: any[]) => call[0] === 'segment');
        expect(segmentCalls).toHaveLength(0);
    });

    it('emits segment output on mount with merged display + state fragments', () => {
        const displayFragment = {
            fragmentType: FragmentType.Label,
            type: 'label',
            image: 'AMRAP',
            origin: 'parser' as const,
            value: undefined,
        };
        const roundFragment = {
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            image: 'Round 1 of 3',
            origin: 'runtime' as const,
            value: { current: 1, total: 3 },
            sourceBlockKey: 'test-block',
            timestamp: new Date(1000),
        };

        const behavior = new ReportOutputBehavior({ emitSegmentOnMount: true });
        const ctx = createMockContext({
            tagFragments: {
                'fragment:display': [displayFragment],
                round: [roundFragment],
            },
            memory: {
                round: { current: 1, total: 3 } as RoundState,
            },
        });

        behavior.onMount(ctx);

        expect(ctx.emitOutput).toHaveBeenCalledWith(
            'segment',
            expect.arrayContaining([
                expect.objectContaining({ type: 'label' }),
                expect.objectContaining({ type: 'current-round' }),
            ]),
            expect.objectContaining({ label: 'Default Label' })
        );
    });

    it('deduplicates overlapping fragment types when merging display + state', () => {
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

        const behavior = new ReportOutputBehavior({ emitSegmentOnMount: true });
        const ctx = createMockContext({
            tagFragments: {
                'fragment:display': [parserTimerFragment],
                timer: [runtimeTimerFragment],
            },
        });

        behavior.onMount(ctx);

        const emittedFragments = (ctx.emitOutput as any).mock.calls[0][1];
        const timerFragments = emittedFragments.filter((f: any) => f.type === 'timer');
        expect(timerFragments).toHaveLength(1);
        expect(timerFragments[0].origin).toBe('parser');
    });

    it('emits milestone on mount for multi-round blocks', () => {
        const behavior = new ReportOutputBehavior();
        const ctx = createMockContext({
            memory: { round: { current: 1, total: 3 } as RoundState },
        });

        behavior.onMount(ctx);

        expect(ctx.emitOutput).toHaveBeenCalledWith(
            'milestone',
            expect.arrayContaining([
                expect.objectContaining({ fragmentType: FragmentType.CurrentRound, value: { current: 1, total: 3 } }),
            ]),
            expect.objectContaining({ label: 'Round 1 of 3' })
        );
    });

    it('does not emit milestone on mount for single-round blocks', () => {
        const behavior = new ReportOutputBehavior();
        const ctx = createMockContext({
            memory: { round: { current: 1, total: 1 } as RoundState },
        });

        behavior.onMount(ctx);

        const milestoneCalls = (ctx.emitOutput as any).mock.calls.filter((call: any[]) => call[0] === 'milestone');
        expect(milestoneCalls).toHaveLength(0);
    });

    it('emits milestone on next when children are completed', () => {
        const behavior = new ReportOutputBehavior();
        const ctx = createMockContext({
            memory: {
                round: { current: 2, total: 5 } as RoundState,
                'children:status': {
                    childIndex: 3,
                    totalChildren: 3,
                    allExecuted: true,
                    allCompleted: true,
                },
            },
        });

        behavior.onNext(ctx);

        expect(ctx.emitOutput).toHaveBeenCalledWith(
            'milestone',
            expect.arrayContaining([
                expect.objectContaining({ fragmentType: FragmentType.CurrentRound, value: { current: 2, total: 5 } }),
            ]),
            expect.objectContaining({ label: 'Round 2 of 5' })
        );
    });

    it('does not emit milestone on next when children are still in progress', () => {
        const behavior = new ReportOutputBehavior();
        const ctx = createMockContext({
            memory: {
                round: { current: 2, total: 5 } as RoundState,
                'children:status': {
                    childIndex: 1,
                    totalChildren: 3,
                    allExecuted: false,
                    allCompleted: false,
                },
            },
        });

        behavior.onNext(ctx);

        expect(ctx.emitOutput).not.toHaveBeenCalled();
    });

    it('computes timer results and emits completion output on unmount', () => {
        const behavior = new ReportOutputBehavior({ label: 'Workout' });
        const timer: TimerState = {
            spans: [new TimeSpan(0, 600), new TimeSpan(800, 1000)],
            direction: 'down',
            durationMs: 120000,
            label: 'Interval',
            role: 'primary',
        };

        const ctx = createMockContext({
            memory: { timer },
            tagFragments: {
                timer: [{
                    fragmentType: FragmentType.Timer,
                    type: 'timer',
                    image: '2:00',
                    origin: 'runtime',
                    value: timer,
                }],
            },
        });

        behavior.onUnmount(ctx);

        expect(ctx.pushMemory).toHaveBeenCalledWith(
            'fragment:result',
            expect.arrayContaining([
                expect.objectContaining({ fragmentType: FragmentType.Elapsed, value: 800 }),
                expect.objectContaining({ fragmentType: FragmentType.Total, value: 1000 }),
                expect.objectContaining({ fragmentType: FragmentType.Spans }),
                expect.objectContaining({ fragmentType: FragmentType.SystemTime }),
            ])
        );

        expect(ctx.emitOutput).toHaveBeenCalledWith(
            'completion',
            expect.arrayContaining([
                expect.objectContaining({ fragmentType: FragmentType.Elapsed, value: 800 }),
                expect.objectContaining({ fragmentType: FragmentType.Total, value: 1000 }),
            ]),
            expect.objectContaining({ label: 'Workout' })
        );
    });

    it('creates degenerate span for non-timer blocks on unmount', () => {
        const behavior = new ReportOutputBehavior();
        const ctx = createMockContext();

        behavior.onUnmount(ctx);

        const resultFragments = (ctx.pushMemory as any).mock.calls[0][1];
        const spans = resultFragments.find((f: any) => f.fragmentType === FragmentType.Spans);
        expect(spans).toBeDefined();
        expect(spans.spans).toHaveLength(1);
        expect(spans.spans[0].started).toBe(spans.spans[0].ended);
    });
});