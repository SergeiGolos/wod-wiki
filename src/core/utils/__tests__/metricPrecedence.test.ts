import { describe, it, expect } from 'bun:test';
import { OwnershipResolver } from '../../metrics/ownership/OwnershipResolver';
import { METRIC_OWNERSHIP_LAYER_CHAIN, getMetricOwnershipLayer } from '../../metrics/ownership/types';
import { MetricType, IMetric, MetricOrigin, MetricAction } from '../../models/Metric';

/**
 * Helper to create a minimal IMetric for testing.
 */
function frag(
    metricType: MetricType,
    origin: MetricOrigin = 'parser',
    value?: unknown,
    action?: MetricAction,
): IMetric {
    return {
        type: metricType,
        origin,
        value,
        action,
    };
}

describe('METRIC_OWNERSHIP_LAYER_CHAIN', () => {
    it('orders parser < dialect < user-plan < runtime < user-entry', () => {
        expect(METRIC_OWNERSHIP_LAYER_CHAIN).toEqual([
            'parser',
            'dialect',
            'user-plan',
            'runtime',
            'user-entry',
        ]);
    });

    it('maps legacy origins to the correct ownership layer', () => {
        expect(getMetricOwnershipLayer('parser')).toBe('parser');
        expect(getMetricOwnershipLayer('compiler')).toBe('dialect');
        expect(getMetricOwnershipLayer('dialect')).toBe('dialect');
        expect(getMetricOwnershipLayer('hinted')).toBe('dialect');
        expect(getMetricOwnershipLayer('user-plan')).toBe('user-plan');
        expect(getMetricOwnershipLayer('runtime')).toBe('runtime');
        expect(getMetricOwnershipLayer('tracked')).toBe('runtime');
        expect(getMetricOwnershipLayer('analyzed')).toBe('runtime');
        expect(getMetricOwnershipLayer('execution')).toBe('runtime');
        expect(getMetricOwnershipLayer('analyzed-estimated')).toBe('runtime');
        expect(getMetricOwnershipLayer('user')).toBe('user-entry');
        expect(getMetricOwnershipLayer('collected')).toBe('user-entry');
    });
});

describe('OwnershipResolver.resolve()', () => {
    const resolver = new OwnershipResolver();

    it('characterizes current ownership chain: runtime display beats dialect and parser for the same type', () => {
        const metrics = [
            frag(MetricType.Duration, 'parser', 'planned'),
            frag(MetricType.Duration, 'dialect', 'dialect-default'),
            frag(MetricType.Duration, 'runtime', 'live'),
        ];

        const result = resolver.resolve(metrics);

        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('runtime');
        expect(getMetricOwnershipLayer(result[0].origin)).toBe('runtime');
    });

    it('characterizes current ownership chain: user-entry display beats runtime, dialect, and parser', () => {
        const metrics = [
            frag(MetricType.Rep, 'parser', 10),
            frag(MetricType.Rep, 'dialect', 12),
            frag(MetricType.Rep, 'runtime', 11),
            frag(MetricType.Rep, 'user', 9),
        ];

        const result = resolver.resolve(metrics);

        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('user');
        expect(result[0].value).toBe(9);
        expect(getMetricOwnershipLayer(result[0].origin)).toBe('user-entry');
    });

    it('uses explicit ownershipLayer when provided for legacy-origin compatibility', () => {
        const parserUserPlan = {
            ...frag(MetricType.Distance, 'parser', 1200),
            ownershipLayer: 'user-plan' as const,
        } as IMetric & { ownershipLayer: 'user-plan' };

        const dialectDefault = frag(MetricType.Distance, 'dialect', 1000);

        const result = resolver.resolve([dialectDefault, parserUserPlan]);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe(1200);
        expect(getMetricOwnershipLayer(result[0].origin)).toBe('parser');
    });

    it('characterizes suppress/hide as display-only: the visible winner is removed without deleting raw inputs', () => {
        const metrics = [
            frag(MetricType.Action, 'parser', 'EMOM'),
            frag(MetricType.Action, 'dialect', undefined, 'suppress'),
        ];

        const result = resolver.resolve(metrics);

        expect(result).toEqual([]);
        expect(metrics).toHaveLength(2);
        expect(metrics.some(m => m.origin === 'parser')).toBe(true);
        expect(metrics.some(m => m.action === 'suppress')).toBe(true);
    });

    it('resolves per-type independently', () => {
        const metrics = [
            frag(MetricType.Duration, 'runtime', 'elapsed'),
            frag(MetricType.Duration, 'parser', 'planned'),
            frag(MetricType.Action, 'parser', 'Thrusters'),
        ];
        const result = resolver.resolve(metrics);

        expect(result).toHaveLength(2);

        const timer = result.find(f => f.type === MetricType.Duration);
        expect(timer?.origin).toBe('runtime');
        expect(timer?.value).toBe('elapsed');

        const action = result.find(f => f.type === MetricType.Action);
        expect(action?.origin).toBe('parser');
        expect(action?.value).toBe('Thrusters');
    });

    it('keeps all metrics when no conflicts', () => {
        const metrics = [
            frag(MetricType.Duration, 'parser', 300),
            frag(MetricType.Rep, 'parser', 21),
            frag(MetricType.Action, 'parser', 'Burpees'),
        ];
        const result = resolver.resolve(metrics);
        expect(result).toHaveLength(3);
    });

    it('filters by origin', () => {
        const metrics = [
            frag(MetricType.Duration, 'runtime', 'live'),
            frag(MetricType.Duration, 'parser', 'plan'),
            frag(MetricType.Rep, 'parser', 10),
        ];
        const result = resolver.resolve(metrics, { origins: ['parser'] });
        expect(result).toHaveLength(2);
        expect(result.every(f => f.origin === 'parser')).toBe(true);
    });

    it('filters by type', () => {
        const metrics = [
            frag(MetricType.Duration, 'parser', 300),
            frag(MetricType.Rep, 'parser', 21),
            frag(MetricType.Action, 'parser', 'Burpees'),
        ];
        const result = resolver.resolve(metrics, {
            types: [MetricType.Duration, MetricType.Rep],
        });
        expect(result).toHaveLength(2);
        expect(result.some(f => f.type === MetricType.Action)).toBe(false);
    });

    it('excludes types', () => {
        const metrics = [
            frag(MetricType.Duration, 'parser', 300),
            frag(MetricType.Rep, 'parser', 21),
            frag(MetricType.Text, 'parser', 'note'),
        ];
        const result = resolver.resolve(metrics, {
            excludeTypes: [MetricType.Text],
        });
        expect(result).toHaveLength(2);
        expect(result.some(f => f.type === MetricType.Text)).toBe(false);
    });

    it('combines filter and precedence', () => {
        const metrics = [
            frag(MetricType.Duration, 'runtime', 'elapsed'),
            frag(MetricType.Duration, 'parser', 'planned'),
            frag(MetricType.Rep, 'compiler', 15),
            frag(MetricType.Rep, 'parser', 10),
            frag(MetricType.Action, 'parser', 'Run'),
        ];
        const result = resolver.resolve(metrics, {
            excludeTypes: [MetricType.Action],
        });
        expect(result).toHaveLength(2);

        const timer = result.find(f => f.type === MetricType.Duration);
        expect(timer?.origin).toBe('runtime');

        const rep = result.find(f => f.type === MetricType.Rep);
        expect(rep?.origin).toBe('compiler');
    });

    it('handles empty input', () => {
        expect(resolver.resolve([])).toEqual([]);
    });

    it('preserves multi-metrics winning tier across types', () => {
        const metrics = [
            frag(MetricType.Rep, 'compiler', 21),
            frag(MetricType.Rep, 'compiler', 15),
            frag(MetricType.Rep, 'compiler', 9),
            frag(MetricType.Rep, 'parser', 10),
            frag(MetricType.Action, 'compiler', 'Thrusters'),
            frag(MetricType.Action, 'compiler', 'Pull-ups'),
        ];
        const result = resolver.resolve(metrics);

        const reps = result.filter(f => f.type === MetricType.Rep);
        expect(reps).toHaveLength(3);
        expect(reps.map(f => f.value)).toEqual([21, 15, 9]);

        const actions = result.filter(f => f.type === MetricType.Action);
        expect(actions).toHaveLength(2);
    });

    it('tracked and analyzed map to runtime layer', () => {
        const metrics = [
            frag(MetricType.Distance, 'parser', 5000),
            frag(MetricType.Distance, 'tracked', 3200),
        ];
        const result = resolver.resolve(metrics);
        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('tracked');
    });

    it('collected maps to user-entry and beats runtime', () => {
        const metrics = [
            frag(MetricType.Rep, 'runtime', 5),
            frag(MetricType.Rep, 'collected', 8),
        ];
        const result = resolver.resolve(metrics);
        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('collected');
    });

    it('treats undefined origin as parser layer', () => {
        const noOrigin = { type: MetricType.Duration, value: 60 } as IMetric;
        const withOrigin = frag(MetricType.Duration, 'compiler', 120);
        const result = resolver.resolve([noOrigin, withOrigin]);
        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('compiler');
    });
});
