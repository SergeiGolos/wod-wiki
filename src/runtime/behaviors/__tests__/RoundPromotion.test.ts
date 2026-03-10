import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { IMetric, MetricType } from '../../../core/models/Metric';
import { MemoryLocation, IMemoryLocation } from '../../memory/MemoryLocation';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { MetricPromotionBehavior } from '../MetricPromotionBehavior';

// --- Test Context Setup ---

function createMockContext(overrides: any = {}): IBehaviorContext & { memoryStore: Map<string, IMemoryLocation[]> } {
    const memoryStore = new Map<string, IMemoryLocation[]>();

    const pushMemory = vi.fn((tag: string, metrics: IMetric[]) => {
        const loc = new MemoryLocation(tag as any, metrics);
        const existing = memoryStore.get(tag) || [];
        existing.push(loc);
        memoryStore.set(tag, existing);
        return loc;
    });

    const updateMemory = vi.fn((tag: string, metrics: IMetric[]) => {
        const matching = memoryStore.get(tag);
        if (matching && matching.length > 0) {
            matching[0].update(metrics);
        }
    });

    const getMemoryByTag = vi.fn((tag: string) => memoryStore.get(tag) || []);

    // Add getMetricMemoryByVisibility stub if needed
    const getMetricMemoryByVisibility = vi.fn((visibility: string) => {
        if (visibility === 'promote') {
            return memoryStore.get('metric:promote') || [];
        }
        return [];
    });

    const mockBlock = {
        key: { toString: () => 'test-block' },
        getMemoryByTag,
        getMetricMemoryByVisibility,
        getAllMemory: vi.fn(() => Array.from(memoryStore.values()).flat()),
        getBehavior: vi.fn(), // Placeholder
    };

    return {
        block: mockBlock as unknown as IRuntimeBlock,
        clock: { now: new Date(1000) },
        stackLevel: 0,
        pushMemory,
        updateMemory,
        memoryStore,
        // ... other unused methods mocked/stubbed
    } as unknown as IBehaviorContext & { memoryStore: Map<string, IMemoryLocation[]> };
}

describe('Round Promotion', () => {

    describe('MetricPromotionBehavior', () => {
        it('should promote metric from source tag to "metric:promote"', () => {
            const ctx = createMockContext();

            // Seed a source metrics
            const roundFragment = {
                type: MetricType.CurrentRound,
                value: 1,
                origin: 'runtime'
            } as any;
            ctx.pushMemory('round', [roundFragment]);

            const behavior = new MetricPromotionBehavior({
                promotions: [{
                    type: MetricType.CurrentRound,
                    sourceTag: 'round'
                }]
            });

            behavior.onMount(ctx);

            // Verify promotion
            const promoted = ctx.memoryStore.get('metric:promote');
            expect(promoted).toBeDefined();
            expect(promoted!.length).toBe(1);

            const promotedFrag = promoted![0].metrics[0];
            expect(promotedFrag.type).toBe(MetricType.CurrentRound);
            expect(promotedFrag.value).toBe(1);
            expect(promotedFrag.origin).toBe('runtime'); // Default origin
        });

        it('should update promoted metrics on next() when dynamic updates enabled', () => {
            const ctx = createMockContext();

            // Seed initial state
            const roundLoc = ctx.pushMemory('round', [{
                type: MetricType.CurrentRound,
                value: 1,
                origin: 'runtime'
            } as any]);

            const behavior = new MetricPromotionBehavior({
                promotions: [{
                    type: MetricType.CurrentRound,
                    sourceTag: 'round',
                    enableDynamicUpdates: true
                }]
            });

            behavior.onMount(ctx);

            // Change source state
            roundLoc.update([{
                type: MetricType.CurrentRound,
                value: 2,
                origin: 'runtime'
            } as any]);

            // Execute onNext
            behavior.onNext(ctx);

            // Verify update
            const promoted = ctx.memoryStore.get('metric:promote');
            expect(promoted![0].metrics[0].value).toBe(2);
        });
    });
});
