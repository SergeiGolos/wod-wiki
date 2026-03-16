import { describe, it, expect, afterEach } from 'bun:test';
import { ReEntryBehavior } from '../ReEntryBehavior';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { MemoryLocation } from '../../memory/MemoryLocation';
import { IMetric, MetricType } from '../../../core/models/Metric';

describe('ReEntryBehavior', () => {
    let harness: BehaviorTestHarness;

    afterEach(() => { harness?.dispose(); });

    describe('onMount', () => {
        it('initializes round state (current=1, total=N)', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const block = new MockBlock('test-block', [
                new ReEntryBehavior({ totalRounds: 5 })
            ], { label: 'Test Block' });
            harness.push(block);
            harness.mount();

            const round = block.getMemoryByTag('round')[0]?.metrics[0] as any;
            expect(round?.value).toBe(1);
        });

        it('supports custom startRound', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const block = new MockBlock('test-block', [
                new ReEntryBehavior({ totalRounds: 7, startRound: 3 })
            ], { label: 'Test Block' });
            harness.push(block);
            harness.mount();

            const round = block.getMemoryByTag('round')[0]?.metrics[0] as any;
            expect(round?.value).toBe(3);
        });

        it('supports unbounded rounds', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const block = new MockBlock('test-block', [
                new ReEntryBehavior({ totalRounds: undefined, startRound: 1 })
            ], { label: 'Test Block' });
            harness.push(block);
            harness.mount();

            const round = block.getMemoryByTag('round')[0]?.metrics[0] as any;
            expect(round?.value).toBe(1);
        });

        it('creates CurrentRoundMetric with sourceBlockKey and timestamp', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const block = new MockBlock('test-block', [
                new ReEntryBehavior({ totalRounds: 3, startRound: 2 })
            ], { label: 'Test Block' });
            harness.push(block);
            harness.mount();

            const round = block.getMemoryByTag('round')[0]?.metrics[0] as any;
            expect(round?.sourceBlockKey).toBe('test-block');
            expect(round?.timestamp).toEqual(new Date(1000));
        });
    });

    describe('onNext', () => {
        it('is a no-op (round advancement handled by ChildSelectionBehavior)', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const block = new MockBlock('test-block', [
                new ReEntryBehavior()
            ], { label: 'Test Block' });
            // Pre-seed round state
            block.pushMemory(new MemoryLocation('round', [{
                type: MetricType.CurrentRound,
                image: 'Round 1',
                origin: 'runtime',
                value: { current: 1, total: 5 },
            } as any]));
            harness.push(block);
            harness.mount();

            const actions = harness.next();

            expect(actions).toEqual([]);
            expect(block.recordings.updateMemory).toHaveLength(0);
        });
    });
});
