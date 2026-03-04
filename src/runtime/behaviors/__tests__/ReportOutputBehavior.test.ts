import { describe, it, expect, vi } from 'bun:test';
import { ReportOutputBehavior } from '../ReportOutputBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { MetricType } from '../../../core/models/Metric';
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

    const pushMemory = vi.fn((tag: string, metrics: any[]) => {
        tagStore.set(tag, metrics);
        return { tag, metrics, update: vi.fn(), subscribe: vi.fn(), dispose: vi.fn() } as any;
    });

    const updateMemory = vi.fn((tag: string, metrics: any[]) => {
        tagStore.set(tag, metrics);
    });

    return {
        block: {
            key: { toString: () => 'test-block' },
            label: options.label ?? 'Default Label',
            metrics: [],
            completionReason: undefined,
            getMemoryByTag: (tag: string) => {
                const metrics = tagStore.get(tag) ?? [];
                if (metrics.length === 0) return [];
                return [{ tag, metrics } as any];
            },
        },
        clock: { now: new Date(1000) },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        getMemoryByTag: (tag: string) => {
            const metrics = tagStore.get(tag) ?? [];
            if (metrics.length === 0) return [];
            return [{ tag, metrics } as any];
        },
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

    it('emits segment output on mount with merged display + state metrics', () => {
        const displayFragment = {
            metricType: MetricType.Label,
            type: 'label',
            image: 'AMRAP',
            origin: 'parser' as const,
            value: undefined,
        };
        const roundFragment = {
            metricType: MetricType.CurrentRound,
            type: 'current-round',
            image: 'Round 1 of 3',
            origin: 'runtime' as const,
            value: 1,
            timestamp: new Date(1000),
        };

        const behavior = new ReportOutputBehavior({ emitSegmentOnMount: true });
        const ctx = createMockContext({
            tagFragments: {
                'metric:display': [displayFragment],
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

    it('deduplicates overlapping metrics types when merging display + state', () => {
        const parserTimerMetric = {
            metricType: MetricType.Duration,
            type: 'time',
            image: '20:00',
            origin: 'parser' as const,
            value: 1200000,
        };
        const runtimeTimerMetric = {
            metricType: MetricType.Duration,
            type: 'time',
            image: '20:00',
            origin: 'runtime' as const,
            value: { direction: 'down', durationMs: 1200000 },
            sourceBlockKey: 'test-block',
            timestamp: new Date(1000),
        };

        const behavior = new ReportOutputBehavior({ emitSegmentOnMount: true });
        const ctx = createMockContext({
            tagFragments: {
                'metric:display': [parserTimerMetric],
                time: [runtimeTimerMetric],
            },
        });

        behavior.onMount(ctx);

        const emittedFragments = (ctx.emitOutput as any).mock.calls[0][1];
        const timerFragments = emittedFragments.filter((f: any) => f.type === 'time');
        expect(timerFragments).toHaveLength(1);
        expect(timerFragments[0].origin).toBe('parser');
    });

    it('emits milestone on mount for multi-round blocks', () => {
        const behavior = new ReportOutputBehavior();
        const roundState: RoundState = { current: 1, total: 3 };
        const ctx = createMockContext({
            tagFragments: {
                round: [{ ...roundState, metricType: MetricType.CurrentRound, type: 'current-round', value: 1 }]
            }
        });

        behavior.onMount(ctx);

        expect(ctx.emitOutput).toHaveBeenCalledWith(
            'milestone',
            expect.arrayContaining([
                expect.objectContaining({ metricType: MetricType.CurrentRound, current: 1, total: 3 }),
            ]),
            expect.objectContaining({ label: 'Round 1 of 3' })
        );
    });

    it('does not emit milestone on mount for single-round blocks', () => {
        const behavior = new ReportOutputBehavior();
        const roundState: RoundState = { current: 1, total: 1 };
        const ctx = createMockContext({
            tagFragments: {
                round: [{ ...roundState, metricType: MetricType.CurrentRound, type: 'current-round', value: 1 }]
            }
        });

        behavior.onMount(ctx);

        const milestoneCalls = (ctx.emitOutput as any).mock.calls.filter((call: any[]) => call[0] === 'milestone');
        expect(milestoneCalls).toHaveLength(0);
    });

    it('emits milestone on next when round advances', () => {
        const behavior = new ReportOutputBehavior();
        const round1: RoundState = { current: 1, total: 5 };
        // Mount with round 1 to initialize lastEmittedRound
        const mountCtx = createMockContext({
            tagFragments: {
                round: [{ ...round1, metricType: MetricType.CurrentRound, type: 'current-round', value: 1 }]
            }
        });
        behavior.onMount(mountCtx);

        // Simulate round advancing to 2 (done by ChildSelectionBehavior)
        const round2: RoundState = { current: 2, total: 5 };
        const ctx = createMockContext({
            tagFragments: {
                round: [{ ...round2, metricType: MetricType.CurrentRound, type: 'current-round', value: 2 }]
            }
        });

        behavior.onNext(ctx);

        expect(ctx.emitOutput).toHaveBeenCalledWith(
            'milestone',
            expect.arrayContaining([
                expect.objectContaining({ metricType: MetricType.CurrentRound, current: 2, total: 5 }),
            ]),
            expect.objectContaining({ label: 'Round 2 of 5' })
        );
    });

    it('does not emit milestone on next when round has not changed', () => {
        const behavior = new ReportOutputBehavior();
        const round2: RoundState = { current: 2, total: 5 };
        // Mount emits milestone for round 2 and sets lastEmittedRound
        const mountCtx = createMockContext({
            tagFragments: {
                round: [{ ...round2, metricType: MetricType.CurrentRound, type: 'current-round', value: 2 }]
            }
        });
        behavior.onMount(mountCtx);

        // onNext with same round should not emit again
        const ctx = createMockContext({
            tagFragments: {
                round: [{ ...round2, metricType: MetricType.CurrentRound, type: 'current-round', value: 2 }]
            }
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
            tagFragments: {
                time: [{
                    metricType: MetricType.Duration,
                    type: 'time',
                    image: '2:00',
                    origin: 'runtime',
                    value: timer,
                }],
            },
        });

        behavior.onUnmount(ctx);

        expect(ctx.pushMemory).toHaveBeenCalledWith(
            'metric:result',
            expect.arrayContaining([
                expect.objectContaining({ metricType: MetricType.Elapsed, value: 800 }),
                expect.objectContaining({ metricType: MetricType.Total, value: 1000 }),
                expect.objectContaining({ metricType: MetricType.Spans }),
                expect.objectContaining({ metricType: MetricType.SystemTime }),
            ])
        );

        expect(ctx.emitOutput).toHaveBeenCalledWith(
            'completion',
            expect.arrayContaining([
                expect.objectContaining({ metricType: MetricType.Elapsed, value: 800 }),
                expect.objectContaining({ metricType: MetricType.Total, value: 1000 }),
            ]),
            expect.objectContaining({ label: 'Workout' })
        );
    });

    it('creates degenerate span for non-timer blocks on unmount', () => {
        const behavior = new ReportOutputBehavior();
        const ctx = createMockContext();

        behavior.onUnmount(ctx);

        const resultFragments = (ctx.pushMemory as any).mock.calls[0][1];
        const spans = resultFragments.find((f: any) => f.metricType === MetricType.Spans);
        expect(spans).toBeDefined();
        expect(spans.spans).toHaveLength(1);
        expect(spans.spans[0].started).toBe(spans.spans[0].ended);
    });
});