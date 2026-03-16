import { describe, it, expect, afterEach } from 'bun:test';
import { ReportOutputBehavior } from '../ReportOutputBehavior';
import { MetricType } from '../../../core/models/Metric';
import { RoundState, TimerState } from '../../memory/MemoryTypes';
import { TimeSpan } from '../../models/TimeSpan';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { MemoryLocation } from '../../memory/MemoryLocation';

describe('ReportOutputBehavior', () => {
    let harness: BehaviorTestHarness;

    afterEach(() => { harness?.dispose(); });

    function setup(config?: ConstructorParameters<typeof ReportOutputBehavior>[0], opts?: {
        tagFragments?: Record<string, any[]>;
        label?: string;
    }) {
        harness = new BehaviorTestHarness().withClock(new Date(1000));
        const behavior = new ReportOutputBehavior(config);
        const block = new MockBlock('test-block', [behavior], { label: opts?.label ?? 'Default Label' });

        if (opts?.tagFragments) {
            for (const [tag, metrics] of Object.entries(opts.tagFragments)) {
                block.pushMemory(new MemoryLocation(tag as any, metrics));
            }
        }

        harness.push(block);
        return { block, behavior };
    }

    it('does not emit segment output on mount by default', () => {
        const { block } = setup();
        harness.mount();

        const segmentOutputs = block.recordings.emitOutput.filter(o => o.type === 'segment');
        expect(segmentOutputs).toHaveLength(0);
    });

    it('emits segment output on mount with merged display + state metrics', () => {
        const displayFragment = {
            type: MetricType.Label,
            image: 'AMRAP',
            origin: 'parser' as const,
            value: undefined,
        };
        const roundFragment = {
            type: MetricType.CurrentRound,
            image: 'Round 1 of 3',
            origin: 'runtime' as const,
            value: 1,
            current: 1,
            total: 3,
            timestamp: new Date(1000),
        };

        const { block } = setup(
            { emitSegmentOnMount: true },
            {
                tagFragments: {
                    'metric:display': [displayFragment],
                    round: [roundFragment],
                },
            }
        );
        harness.mount();

        const segmentOutputs = block.recordings.emitOutput.filter(o => o.type === 'segment');
        expect(segmentOutputs).toHaveLength(1);
        expect(segmentOutputs[0].metrics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: 'label' }),
                expect.objectContaining({ type: 'current-round' }),
            ])
        );
        expect(segmentOutputs[0].options).toEqual(expect.objectContaining({ label: 'Default Label' }));
    });

    it('deduplicates overlapping metrics types when merging display + state', () => {
        const parserTimerMetric = {
            type: MetricType.Duration,
            image: '20:00',
            origin: 'parser' as const,
            value: 1200000,
        };
        const runtimeTimerMetric = {
            type: MetricType.Duration,
            image: '20:00',
            origin: 'runtime' as const,
            value: { direction: 'down', durationMs: 1200000 },
            sourceBlockKey: 'test-block',
            timestamp: new Date(1000),
        };

        const { block } = setup(
            { emitSegmentOnMount: true },
            {
                tagFragments: {
                    'metric:display': [parserTimerMetric],
                    time: [runtimeTimerMetric],
                },
            }
        );
        harness.mount();

        const segmentOutputs = block.recordings.emitOutput.filter(o => o.type === 'segment');
        const timerFragments = segmentOutputs[0].metrics.filter((f: any) => f.type === MetricType.Duration);
        expect(timerFragments).toHaveLength(1);
        expect(timerFragments[0].origin).toBe('parser');
    });

    it('emits milestone on mount for multi-round blocks', () => {
        const roundState: RoundState = { current: 1, total: 3 };
        const { block } = setup(undefined, {
            tagFragments: {
                round: [{ ...roundState, type: MetricType.CurrentRound, value: 1, image: '', origin: 'runtime' }]
            }
        });
        harness.mount();

        const milestoneOutputs = block.recordings.emitOutput.filter(o => o.type === 'milestone');
        expect(milestoneOutputs).toHaveLength(1);
        expect(milestoneOutputs[0].metrics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: MetricType.CurrentRound, current: 1, total: 3 }),
            ])
        );
        expect(milestoneOutputs[0].options).toEqual(expect.objectContaining({ label: 'Round 1 of 3' }));
    });

    it('does not emit milestone on mount for single-round blocks', () => {
        const roundState: RoundState = { current: 1, total: 1 };
        const { block } = setup(undefined, {
            tagFragments: {
                round: [{ ...roundState, type: MetricType.CurrentRound, value: 1, image: '', origin: 'runtime' }]
            }
        });
        harness.mount();

        const milestoneOutputs = block.recordings.emitOutput.filter(o => o.type === 'milestone');
        expect(milestoneOutputs).toHaveLength(0);
    });

    it('emits milestone on next when round advances', () => {
        const round1: RoundState = { current: 1, total: 5 };
        const { block } = setup(undefined, {
            tagFragments: {
                round: [{ ...round1, type: MetricType.CurrentRound, value: 1, image: '', origin: 'runtime' }]
            }
        });
        harness.mount();

        // Update round to 2
        const roundLoc = block.getMemoryByTag('round')[0];
        const round2 = { current: 2, total: 5 } as RoundState;
        roundLoc.update([{ ...round2, type: MetricType.CurrentRound, value: 2, image: '', origin: 'runtime' } as any]);

        harness.next();

        const milestoneOutputs = block.recordings.emitOutput.filter(o => o.type === 'milestone');
        expect(milestoneOutputs).toHaveLength(2); // round 1 from mount + round 2 from next
        const round2Milestone = milestoneOutputs[1];
        expect(round2Milestone.metrics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: MetricType.CurrentRound, current: 2, total: 5 }),
            ])
        );
        expect(round2Milestone.options).toEqual(expect.objectContaining({ label: 'Round 2 of 5' }));
    });

    it('does not emit milestone on next when round has not changed', () => {
        const round2: RoundState = { current: 2, total: 5 };
        const { block } = setup(undefined, {
            tagFragments: {
                round: [{ ...round2, type: MetricType.CurrentRound, value: 2, image: '', origin: 'runtime' }]
            }
        });
        harness.mount();

        const countAfterMount = block.recordings.emitOutput.length;

        harness.next();

        // No new outputs should have been emitted
        expect(block.recordings.emitOutput.length).toBe(countAfterMount);
    });

    it('computes timer results and emits completion output on unmount', () => {
        const timer: TimerState = {
            spans: [new TimeSpan(0, 600), new TimeSpan(800, 1000)],
            direction: 'down',
            durationMs: 120000,
            label: 'Interval',
            role: 'primary',
        };

        harness = new BehaviorTestHarness().withClock(new Date(1000));
        const behavior = new ReportOutputBehavior({ label: 'Workout' });
        const block = new MockBlock('test-block', [behavior], { label: 'Workout' });
        block.pushMemory(new MemoryLocation('time' as any, [{
            type: MetricType.Duration,
            image: '2:00',
            origin: 'runtime',
            value: timer,
        } as any]));

        harness.push(block);
        harness.mount();
        harness.unmount();

        const resultPush = block.recordings.pushMemory.find(p => p.tag === 'metric:result');
        expect(resultPush).toBeDefined();
        expect(resultPush!.metrics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: MetricType.Elapsed, value: 800 }),
                expect.objectContaining({ type: MetricType.Total, value: 1000 }),
                expect.objectContaining({ type: MetricType.Spans }),
                expect.objectContaining({ type: MetricType.SystemTime }),
            ])
        );

        const completionOutputs = block.recordings.emitOutput.filter(o => o.type === 'completion');
        expect(completionOutputs).toHaveLength(1);
        expect(completionOutputs[0].metrics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: MetricType.Elapsed, value: 800 }),
                expect.objectContaining({ type: MetricType.Total, value: 1000 }),
            ])
        );
        expect(completionOutputs[0].options).toEqual(expect.objectContaining({ label: 'Workout' }));
    });

    it('creates degenerate span for non-timer blocks on unmount', () => {
        const { block } = setup();
        harness.mount();
        harness.unmount();

        const resultPush = block.recordings.pushMemory.find(p => p.tag === 'metric:result');
        expect(resultPush).toBeDefined();

        const spans = resultPush!.metrics.find((f: any) => f.type === MetricType.Spans);
        expect(spans).toBeDefined();
        expect((spans as any).spans).toHaveLength(1);
        expect((spans as any).spans[0].started).toBe((spans as any).spans[0].ended);
    });
});