import { describe, it, expect, afterEach } from 'bun:test';
import { MetricType } from '../../../core/models/Metric';
import { MemoryLocation } from '../../memory/MemoryLocation';
import { MetricPromotionBehavior } from '../MetricPromotionBehavior';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';

describe('Round Promotion', () => {

    let harness: BehaviorTestHarness;

    afterEach(() => { harness?.dispose(); });

    describe('MetricPromotionBehavior', () => {
        it('should promote metric from source tag to "metric:promote"', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));

            const behavior = new MetricPromotionBehavior({
                promotions: [{
                    type: MetricType.CurrentRound,
                    sourceTag: 'round'
                }]
            });
            const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });

            // Seed a source metric
            const roundFragment = {
                type: MetricType.CurrentRound,
                value: 1,
                origin: 'runtime'
            } as any;
            block.pushMemory(new MemoryLocation('round', [roundFragment]));

            harness.push(block);
            harness.mount();

            // Verify promotion via block memory
            const promoted = block.getMemoryByTag('metric:promote');
            expect(promoted).toBeDefined();
            expect(promoted.length).toBe(1);

            const promotedFrag = promoted[0].metrics[0];
            expect(promotedFrag.type).toBe(MetricType.CurrentRound);
            expect(promotedFrag.value).toBe(1);
            expect(promotedFrag.origin).toBe('runtime');
        });

        it('should update promoted metrics on next() when dynamic updates enabled', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));

            const behavior = new MetricPromotionBehavior({
                promotions: [{
                    type: MetricType.CurrentRound,
                    sourceTag: 'round',
                    enableDynamicUpdates: true
                }]
            });
            const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });

            // Seed initial state
            const roundLoc = new MemoryLocation('round', [{
                type: MetricType.CurrentRound,
                value: 1,
                origin: 'runtime'
            } as any]);
            block.pushMemory(roundLoc);

            harness.push(block);
            harness.mount();

            // Change source state
            roundLoc.update([{
                type: MetricType.CurrentRound,
                value: 2,
                origin: 'runtime'
            } as any]);

            // Execute onNext
            harness.next();

            // Verify update
            const promoted = block.getMemoryByTag('metric:promote');
            expect(promoted[0].metrics[0].value).toBe(2);
        });
    });
});
