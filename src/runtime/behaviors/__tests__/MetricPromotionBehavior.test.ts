import { describe, it, expect, vi } from 'bun:test';
import { MetricType, IMetric } from '../../../core/models/Metric';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { IMemoryLocation, MemoryLocation } from '../../memory/MemoryLocation';
import { MetricPromotionBehavior } from '../MetricPromotionBehavior';
import { CurrentRoundMetric } from '../../compiler/metrics/CurrentRoundMetric';
import { RoundState } from '../../memory/MemoryTypes';

function createMockContext(overrides: Partial<IBehaviorContext> = {}): IBehaviorContext & { memoryStore: Map<string, IMemoryLocation[]> } {
    const memoryStore = new Map<string, IMemoryLocation[]>();

    const pushMemory = vi.fn((tag: string, metrics: IMetric[]) => {
        const location = new MemoryLocation(tag as any, metrics);
        const existing = memoryStore.get(tag) ?? [];
        existing.push(location);
        memoryStore.set(tag, existing);
        return location;
    });

    const updateMemory = vi.fn((tag: string, metrics: IMetric[]) => {
        const existing = memoryStore.get(tag);
        if (!existing || existing.length === 0) {
            const location = new MemoryLocation(tag as any, metrics);
            memoryStore.set(tag, [location]);
            return;
        }

        existing[0].update(metrics);
    });

    const context: IBehaviorContext & { memoryStore: Map<string, IMemoryLocation[]> } = {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Test Block',
            metrics: [],
            completionReason: undefined,
            getMemoryByTag: vi.fn((tag: string) => memoryStore.get(tag) ?? []),
            getAllMemory: vi.fn(() => Array.from(memoryStore.values()).flat()),
            getBehavior: vi.fn(),
        } as any,
        clock: { now: new Date('2024-01-01T00:00:00Z') },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemoryByTag: vi.fn((tag: string) => memoryStore.get(tag) ?? []),
        getMemory: vi.fn((tag: string) => {
            const location = memoryStore.get(tag)?.[0];
            if (!location || location.metrics.length === 0) return undefined;
            // Special case: synthesize RoundState from CurrentRoundMetric fields
            if (tag === 'round') {
                const frag = location.metrics[0] as unknown as { current?: number; total?: number };
                if (frag?.current !== undefined) {
                    return { current: frag.current, total: frag.total } as RoundState;
                }
                return undefined;
            }
            return location.metrics[0]?.value;
        }),
        setMemory: vi.fn(),
        pushMemory,
        updateMemory,
        memoryStore,
        ...overrides
    } as any;

    return context;
}

describe('MetricPromotionBehavior', () => {
    it('promotes metric by type to metric:promote memory', () => {
        const ctx = createMockContext();
        ctx.pushMemory('round', [new CurrentRoundMetric(1, 5, 'test-block', new Date())]);

        const behavior = new MetricPromotionBehavior({
            promotions: [{ metricType: MetricType.CurrentRound, sourceTag: 'round' }]
        });

        behavior.onMount(ctx);

        const promoted = ctx.memoryStore.get('metric:promote')?.[0]?.metrics;
        expect(promoted).toBeDefined();
        expect(promoted?.[0].metricType).toBe(MetricType.CurrentRound);
        expect(promoted?.[0].origin).toBe('runtime');
    });

    it('uses configured origin override', () => {
        const ctx = createMockContext();
        ctx.pushMemory('round', [new CurrentRoundMetric(1, undefined, 'test-block', new Date())]);

        const behavior = new MetricPromotionBehavior({
            promotions: [{
                metricType: MetricType.CurrentRound,
                sourceTag: 'round',
                origin: 'runtime'
            }]
        });

        behavior.onMount(ctx);

        const promoted = ctx.memoryStore.get('metric:promote')?.[0]?.metrics[0];
        expect(promoted?.origin).toBe('runtime');
    });

    it('skips promotion when source metrics is not found', () => {
        const ctx = createMockContext();
        const behavior = new MetricPromotionBehavior({
            promotions: [{ metricType: MetricType.CurrentRound, sourceTag: 'round' }]
        });

        behavior.onMount(ctx);

        expect(ctx.memoryStore.get('metric:promote')).toBeUndefined();
    });

    it('does not re-promote on next when enableDynamicUpdates is false', () => {
        const ctx = createMockContext();
        const roundLocation = ctx.pushMemory('round', [new CurrentRoundMetric(1, 3, 'test-block', new Date())]);

        const behavior = new MetricPromotionBehavior({
            promotions: [{ metricType: MetricType.CurrentRound, sourceTag: 'round' }]
        });

        behavior.onMount(ctx);
        roundLocation.update([new CurrentRoundMetric(2, 3, 'test-block', new Date())]);

        behavior.onNext(ctx);

        const promoted = ctx.memoryStore.get('metric:promote')?.[0]?.metrics[0];
        expect(promoted?.value).toBe(1);
    });

    it('re-promotes on next when enableDynamicUpdates is true', () => {
        const ctx = createMockContext();
        const roundLocation = ctx.pushMemory('round', [new CurrentRoundMetric(1, 3, 'test-block', new Date())]);

        const behavior = new MetricPromotionBehavior({
            promotions: [{
                metricType: MetricType.CurrentRound,
                sourceTag: 'round',
                enableDynamicUpdates: true
            }]
        });

        behavior.onMount(ctx);
        roundLocation.update([new CurrentRoundMetric(2, 3, 'test-block', new Date())]);

        behavior.onNext(ctx);

        const promoted = ctx.memoryStore.get('metric:promote')?.[0]?.metrics[0];
        expect(promoted?.value).toBe(2);
    });

    it('writes rep scheme to metrics:rep-target and updates on round change', () => {
        const ctx = createMockContext();
        const roundLocation = ctx.pushMemory('round', [new CurrentRoundMetric(1, 3, 'test-block', new Date())]);

        const behavior = new MetricPromotionBehavior({
            repScheme: [21, 15, 9],
            promotions: []
        });

        behavior.onMount(ctx);
        expect(ctx.memoryStore.get('metric:rep-target')?.[0]?.metrics[0].value).toBe(21);

        roundLocation.update([new CurrentRoundMetric(2, 3, 'test-block', new Date())]);

        behavior.onNext(ctx);
        expect(ctx.memoryStore.get('metric:rep-target')?.[0]?.metrics[0].value).toBe(15);
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
        const ctx = createMockContext();
        ctx.pushMemory('round', [new CurrentRoundMetric(1, 2, 'test-block', new Date())]);
        ctx.pushMemory(  'metric', [{
            metricType: MetricType.Rep,
            type: 'rep',
            origin: 'parser',
            value: 10,
            image: '10'
        } as IMetric]);

        const behavior = new MetricPromotionBehavior({
            promotions: [
                { metricType: MetricType.CurrentRound, sourceTag: 'round' },
                { metricType: MetricType.Rep, sourceTag:   'metric' }
            ]
        });

        behavior.onMount(ctx);

        const promoted = ctx.memoryStore.get('metric:promote')?.[0]?.metrics ?? [];
        expect(promoted.filter(metric => metric.metricType === MetricType.CurrentRound)).toHaveLength(1);
        expect(promoted.filter(metric => metric.metricType === MetricType.Rep)).toHaveLength(1);
    });
});