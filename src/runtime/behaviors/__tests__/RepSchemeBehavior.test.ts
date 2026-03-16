import { describe, it, expect, afterEach } from 'bun:test';
import { MetricPromotionBehavior } from '../MetricPromotionBehavior';
import { MetricType } from '../../../core/models/Metric';
import { RoundState } from '../../memory/MemoryTypes';
import { MemoryLocation } from '../../memory/MemoryLocation';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';

function makeRoundMetric(round: RoundState) {
    return { ...round, type: MetricType.CurrentRound, image: '', origin: 'runtime' as any } as any;
}

describe('MetricPromotionBehavior repScheme', () => {
    let harness: BehaviorTestHarness;

    afterEach(() => { harness?.dispose(); });

    // ── IRepSource contract ──────────────────────────────────────────

    describe('IRepSource — getRepsForRound', () => {
        it('should return correct reps for 1-based round index', () => {
            const behavior = new MetricPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });

            expect(behavior.getRepsForRound(1)).toBe(21);
            expect(behavior.getRepsForRound(2)).toBe(15);
            expect(behavior.getRepsForRound(3)).toBe(9);
        });

        it('should wrap around when round exceeds scheme length', () => {
            const behavior = new MetricPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });

            expect(behavior.getRepsForRound(4)).toBe(21);
            expect(behavior.getRepsForRound(5)).toBe(15);
            expect(behavior.getRepsForRound(6)).toBe(9);
        });

        it('should return undefined for empty rep scheme', () => {
            const behavior = new MetricPromotionBehavior({ repScheme: [], promotions: [] });

            expect(behavior.getRepsForRound(1)).toBeUndefined();
        });

        it('should handle single-element scheme', () => {
            const behavior = new MetricPromotionBehavior({ repScheme: [10], promotions: [] });

            expect(behavior.getRepsForRound(1)).toBe(10);
            expect(behavior.getRepsForRound(2)).toBe(10);
            expect(behavior.getRepsForRound(100)).toBe(10);
        });
    });

    describe('IRepSource — getRepsForCurrentRound', () => {
        it('should return first rep value before any mount', () => {
            const behavior = new MetricPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });

            expect(behavior.getRepsForCurrentRound()).toBe(21);
        });

        it('should return reps for last promoted round after mount', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new MetricPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const block = new MockBlock('loop-block', [behavior], { label: 'Loop' });
            block.pushMemory(new MemoryLocation('round', [makeRoundMetric({ current: 2, total: 3 })]));
            harness.push(block);
            harness.mount();

            expect(behavior.getRepsForCurrentRound()).toBe(15);
        });
    });

    describe('IRepSource — repScheme property', () => {
        it('should expose readonly copy of rep scheme', () => {
            const original = [21, 15, 9];
            const behavior = new MetricPromotionBehavior({ repScheme: original, promotions: [] });

            expect(behavior.repScheme).toEqual([21, 15, 9]);

            original.push(99);
            expect(behavior.repScheme).toEqual([21, 15, 9]);
        });
    });

    // ── onMount ──────────────────────────────────────────────────────

    describe('onMount — promotes reps for initial round', () => {
        it('should push rep metrics to metrics:rep-target on mount', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new MetricPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const block = new MockBlock('loop-block', [behavior], { label: 'Loop' });
            block.pushMemory(new MemoryLocation('round', [makeRoundMetric({ current: 1, total: 3 })]));
            harness.push(block);
            harness.mount();

            const repTarget = block.recordings.pushMemory.find(p => p.tag === 'metric:rep-target');
            expect(repTarget).toBeDefined();
            expect(repTarget!.metrics).toEqual([expect.objectContaining({
                type: MetricType.Rep,
                value: 21,
                image: '21',
                origin: 'runtime',
            })]);
        });

        it('should use round 1 when no round memory exists', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new MetricPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const block = new MockBlock('loop-block', [behavior], { label: 'Loop' });
            harness.push(block);
            harness.mount();

            const repTarget = block.recordings.pushMemory.find(p => p.tag === 'metric:rep-target');
            expect(repTarget).toBeDefined();
            expect(repTarget!.metrics).toEqual([expect.objectContaining({ value: 21 })]);
        });

        it('should promote reps for non-first round on mount', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new MetricPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const block = new MockBlock('loop-block', [behavior], { label: 'Loop' });
            block.pushMemory(new MemoryLocation('round', [makeRoundMetric({ current: 2, total: 3 })]));
            harness.push(block);
            harness.mount();

            const repTarget = block.recordings.pushMemory.find(p => p.tag === 'metric:rep-target');
            expect(repTarget).toBeDefined();
            expect(repTarget!.metrics).toEqual([expect.objectContaining({ value: 15, image: '15' })]);
        });

        it('should not push memory when rep scheme is empty', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new MetricPromotionBehavior({ repScheme: [], promotions: [] });
            const block = new MockBlock('loop-block', [behavior], { label: 'Loop' });
            block.pushMemory(new MemoryLocation('round', [makeRoundMetric({ current: 1, total: 3 })]));
            harness.push(block);
            harness.mount();

            expect(block.recordings.pushMemory).toHaveLength(0);
        });

        it('should return empty actions on mount', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new MetricPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const block = new MockBlock('loop-block', [behavior], { label: 'Loop' });
            block.pushMemory(new MemoryLocation('round', [makeRoundMetric({ current: 1, total: 3 })]));
            harness.push(block);

            const actions = harness.mount();
            expect(actions).toEqual([]);
        });
    });

    // ── onNext — round change detection ──────────────────────────────

    describe('onNext — promotes reps on round change', () => {
        it('should update rep-target when round advances', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new MetricPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const block = new MockBlock('loop-block', [behavior], { label: 'Loop' });
            block.pushMemory(new MemoryLocation('round', [makeRoundMetric({ current: 1, total: 3 })]));
            harness.push(block);
            harness.mount();

            // Advance to round 2
            block.getMemoryByTag('round')[0].update([makeRoundMetric({ current: 2, total: 3 })]);
            harness.next();

            const repUpdate = block.recordings.updateMemory.find(u => u.tag === 'metric:rep-target');
            expect(repUpdate).toBeDefined();
            expect(repUpdate!.metrics).toEqual([expect.objectContaining({ value: 15, image: '15' })]);
        });

        it('should NOT promote when round has not changed', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new MetricPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const block = new MockBlock('loop-block', [behavior], { label: 'Loop' });
            block.pushMemory(new MemoryLocation('round', [makeRoundMetric({ current: 1, total: 3 })]));
            harness.push(block);
            harness.mount();

            const pushCountAfterMount = block.recordings.pushMemory.length;
            const updateCountAfterMount = block.recordings.updateMemory.length;

            // onNext with same round 1 — should NOT promote
            harness.next();
            expect(block.recordings.pushMemory.length).toBe(pushCountAfterMount);
            expect(block.recordings.updateMemory.length).toBe(updateCountAfterMount);
        });

        it('should NOT promote when no round memory exists', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new MetricPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const block = new MockBlock('loop-block', [behavior], { label: 'Loop' });
            // No round memory seeded
            harness.push(block);
            harness.mount();

            const pushCountAfterMount = block.recordings.pushMemory.length;
            const updateCountAfterMount = block.recordings.updateMemory.length;

            // onNext with no round memory — should not promote
            harness.next();
            expect(block.recordings.pushMemory.length).toBe(pushCountAfterMount);
            expect(block.recordings.updateMemory.length).toBe(updateCountAfterMount);
        });

        it('should handle full round-robin cycle over multiple advances', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new MetricPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const block = new MockBlock('loop-block', [behavior], { label: 'Loop' });
            block.pushMemory(new MemoryLocation('round', [makeRoundMetric({ current: 1, total: 6 })]));
            harness.push(block);

            // Mount: round 1 → 21
            harness.mount();
            const repTarget = block.recordings.pushMemory.find(p => p.tag === 'metric:rep-target');
            expect(repTarget!.metrics).toEqual([expect.objectContaining({ value: 21 })]);

            // Round 2 → 15
            block.getMemoryByTag('round')[0].update([makeRoundMetric({ current: 2, total: 6 })]);
            harness.next();
            expect(block.recordings.updateMemory.filter(u => u.tag === 'metric:rep-target').at(-1)!.metrics)
                .toEqual([expect.objectContaining({ value: 15 })]);

            // Round 3 → 9
            block.getMemoryByTag('round')[0].update([makeRoundMetric({ current: 3, total: 6 })]);
            harness.next();
            expect(block.recordings.updateMemory.filter(u => u.tag === 'metric:rep-target').at(-1)!.metrics)
                .toEqual([expect.objectContaining({ value: 9 })]);

            // Round 4 → wraps to 21
            block.getMemoryByTag('round')[0].update([makeRoundMetric({ current: 4, total: 6 })]);
            harness.next();
            expect(block.recordings.updateMemory.filter(u => u.tag === 'metric:rep-target').at(-1)!.metrics)
                .toEqual([expect.objectContaining({ value: 21 })]);
        });
    });

    // ── Lifecycle ────────────────────────────────────────────────────

    describe('onUnmount / onDispose', () => {
        it('should return empty actions on unmount', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new MetricPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const block = new MockBlock('loop-block', [behavior], { label: 'Loop' });
            harness.push(block);
            harness.mount();

            const actions = block.unmount(harness.runtime);
            expect(actions).toEqual([]);
        });

        it('should not throw on dispose', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new MetricPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const block = new MockBlock('loop-block', [behavior], { label: 'Loop' });
            harness.push(block);
            harness.mount();

            expect(() => block.dispose()).not.toThrow();
        });
    });

    // ── Fragment shape ───────────────────────────────────────────────

    describe('emitted metrics shape', () => {
        it('should include sourceBlockKey and timestamp in metric', () => {
            const clockTime = new Date('2024-06-15T10:00:00Z');
            harness = new BehaviorTestHarness().withClock(clockTime);
            const behavior = new MetricPromotionBehavior({ repScheme: [10], promotions: [] });
            const block = new MockBlock('loop-block', [behavior], { label: 'Loop' });
            block.pushMemory(new MemoryLocation('round', [makeRoundMetric({ current: 1, total: 1 })]));
            harness.push(block);
            harness.mount();

            const repTarget = block.recordings.pushMemory.find(p => p.tag === 'metric:rep-target');
            expect(repTarget!.metrics).toEqual([expect.objectContaining({
                sourceBlockKey: 'loop-block',
                timestamp: clockTime,
            })]);
        });
    });
});
