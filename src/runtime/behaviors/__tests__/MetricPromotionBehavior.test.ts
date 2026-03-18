import { describe, it, expect, afterEach } from 'bun:test';
import { MetricType, IMetric } from '../../../core/models/Metric';
import { MemoryLocation } from '../../memory/MemoryLocation';
import { MetricPromotionBehavior } from '../MetricPromotionBehavior';
import { CurrentRoundMetric } from '../../compiler/metrics/CurrentRoundMetric';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';

describe('MetricPromotionBehavior', () => {
    let harness: BehaviorTestHarness;

    afterEach(() => { harness?.dispose(); });

    function setup(config: ConstructorParameters<typeof MetricPromotionBehavior>[0], seedRound?: { current: number; total?: number }) {
        harness = new BehaviorTestHarness().withClock(new Date('2024-01-01T00:00:00Z'));
        const behavior = new MetricPromotionBehavior(config);
        const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });
        if (seedRound) {
            block.pushMemory(new MemoryLocation('round', [
                new CurrentRoundMetric(seedRound.current, seedRound.total, 'test-block', new Date())
            ]));
        }
        harness.push(block);
        return { block, behavior };
    }

    it('promotes metric by type to metric:promote memory', () => {
        const { block } = setup(
            { promotions: [{ metricType: MetricType.CurrentRound, sourceTag: 'round' }] },
            { current: 1, total: 5 }
        );
        harness.mount();

        const promoted = block.getMemoryByTag('metric:promote')[0]?.metrics;
        expect(promoted).toBeDefined();
        expect(promoted?.[0].type).toBe(MetricType.CurrentRound);
        expect(promoted?.[0].origin).toBe('runtime');
    });

    it('uses configured origin override', () => {
        const { block } = setup(
            { promotions: [{ metricType: MetricType.CurrentRound, sourceTag: 'round', origin: 'runtime' }] },
            { current: 1 }
        );
        harness.mount();

        const promoted = block.getMemoryByTag('metric:promote')[0]?.metrics[0];
        expect(promoted?.origin).toBe('runtime');
    });

    it('skips promotion when source metrics is not found', () => {
        const { block } = setup({ promotions: [{ metricType: MetricType.CurrentRound, sourceTag: 'round' }] });
        harness.mount();

        expect(block.getMemoryByTag('metric:promote')).toHaveLength(0);
    });

    it('does not re-promote on next when enableDynamicUpdates is false', () => {
        const { block } = setup(
            { promotions: [{ metricType: MetricType.CurrentRound, sourceTag: 'round' }] },
            { current: 1, total: 3 }
        );
        harness.mount();

        // Update round memory to round 2
        const roundLoc = block.getMemoryByTag('round')[0];
        roundLoc.update([new CurrentRoundMetric(2, 3, 'test-block', new Date())]);

        harness.next();

        const promoted = block.getMemoryByTag('metric:promote')[0]?.metrics[0];
        expect(promoted?.value).toBe(1);
    });

    it('re-promotes on next when enableDynamicUpdates is true', () => {
        const { block } = setup(
            { promotions: [{ metricType: MetricType.CurrentRound, sourceTag: 'round', enableDynamicUpdates: true }] },
            { current: 1, total: 3 }
        );
        harness.mount();

        const roundLoc = block.getMemoryByTag('round')[0];
        roundLoc.update([new CurrentRoundMetric(2, 3, 'test-block', new Date())]);

        harness.next();

        const promoted = block.getMemoryByTag('metric:promote')[0]?.metrics[0];
        expect(promoted?.value).toBe(2);
    });

    it('writes rep scheme to metrics:rep-target and updates on round change', () => {
        const { block } = setup(
            { repScheme: [21, 15, 9], promotions: [] },
            { current: 1, total: 3 }
        );
        harness.mount();
        expect(block.getMemoryByTag('metric:rep-target')[0]?.metrics[0].value).toBe(21);

        const roundLoc = block.getMemoryByTag('round')[0];
        roundLoc.update([new CurrentRoundMetric(2, 3, 'test-block', new Date())]);

        harness.next();
        expect(block.getMemoryByTag('metric:rep-target')[0]?.metrics[0].value).toBe(15);
    });

    it('supports rep scheme round-robin and IRepSource methods', () => {
        const behavior = new MetricPromotionBehavior({
            repScheme: [21, 15, 9],
            promotions: []
        });

        expect(behavior.getRepsForRound(1)).toBe(21);
        expect(behavior.getRepsForRound(2)).toBe(15);
        expect(behavior.getRepsForRound(3)).toBe(9);
        expect(behavior.getRepsForRound(4)).toBe(21);
        expect(behavior.repScheme).toEqual([21, 15, 9]);
    });

    it('handles multiple promotion rules without duplicate metrics types', () => {
        harness = new BehaviorTestHarness().withClock(new Date('2024-01-01T00:00:00Z'));
        const behavior = new MetricPromotionBehavior({
            promotions: [
                { metricType: MetricType.CurrentRound, sourceTag: 'round' },
                { metricType: MetricType.Rep, sourceTag: 'metric' }
            ]
        });
        const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });

        block.pushMemory(new MemoryLocation('round', [
            new CurrentRoundMetric(1, 2, 'test-block', new Date())
        ]));
        block.pushMemory(new MemoryLocation('metric', [{
            type: MetricType.Rep,
            origin: 'parser',
            value: 10,
            image: '10'
        } as IMetric]));

        harness.push(block);
        harness.mount();

        const promoted = block.getMemoryByTag('metric:promote')[0]?.metrics ?? [];
        expect(promoted.filter(metric => metric.type === MetricType.CurrentRound)).toHaveLength(1);
        expect(promoted.filter(metric => metric.type === MetricType.Rep)).toHaveLength(1);
    });
});