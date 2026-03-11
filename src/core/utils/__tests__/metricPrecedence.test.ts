import { describe, it, expect } from 'bun:test';
import { resolveMetricPrecedence, selectBestTier, ORIGIN_PRECEDENCE } from '../metricPrecedence';
import { MetricType, IMetric, MetricOrigin } from '../../models/Metric';

/**
 * Helper to create a minimal IMetric for testing.
 */
function frag(
    metricType: MetricType,
    origin: MetricOrigin = 'parser',
    value?: unknown
): IMetric {
    return {
        type: metricType,
        metricType,
        origin,
        value,
    };
}

describe('ORIGIN_PRECEDENCE', () => {
    it('maps user and collected to tier 0', () => {
        expect(ORIGIN_PRECEDENCE['user']).toBe(0);
        expect(ORIGIN_PRECEDENCE['collected']).toBe(0);
    });

    it('maps runtime, tracked, analyzed to tier 1', () => {
        expect(ORIGIN_PRECEDENCE['runtime']).toBe(1);
        expect(ORIGIN_PRECEDENCE['tracked']).toBe(1);
        expect(ORIGIN_PRECEDENCE['analyzed']).toBe(1);
    });

    it('maps compiler and hinted to tier 2', () => {
        expect(ORIGIN_PRECEDENCE['compiler']).toBe(2);
        expect(ORIGIN_PRECEDENCE['hinted']).toBe(2);
    });

    it('maps parser to tier 3', () => {
        expect(ORIGIN_PRECEDENCE['parser']).toBe(3);
    });
});

describe('selectBestTier', () => {
    it('returns single metrics when only one exists', () => {
        const metrics = [frag(MetricType.Duration, 'parser')];
        const result = selectBestTier(metrics);
        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('parser');
    });

    it('selects highest precedence (lowest rank) tier', () => {
        const metrics = [
            frag(MetricType.Duration, 'parser', 'plan'),
            frag(MetricType.Duration, 'runtime', 'actual'),
        ];
        const result = selectBestTier(metrics);
        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('runtime');
        expect(result[0].value).toBe('actual');
    });

    it('user overrides everything', () => {
        const metrics = [
            frag(MetricType.Rep, 'parser', 10),
            frag(MetricType.Rep, 'compiler', 15),
            frag(MetricType.Rep, 'runtime', 20),
            frag(MetricType.Rep, 'user', 25),
        ];
        const result = selectBestTier(metrics);
        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('user');
        expect(result[0].value).toBe(25);
    });

    it('preserves multiple metrics in the winning tier', () => {
        const metrics = [
            frag(MetricType.Rep, 'compiler', 21),
            frag(MetricType.Rep, 'compiler', 15),
            frag(MetricType.Rep, 'compiler', 9),
            frag(MetricType.Rep, 'parser', 10),
        ];
        const result = selectBestTier(metrics);
        expect(result).toHaveLength(3);
        expect(result.every(f => f.origin === 'compiler')).toBe(true);
        expect(result.map(f => f.value)).toEqual([21, 15, 9]);
    });

    it('treats undefined origin as parser (tier 3)', () => {
        const noOrigin: IMetric = {
            type: MetricType.Duration,
            value: 60,
        };
        const withOrigin = frag(MetricType.Duration, 'compiler', 120);
        const result = selectBestTier([noOrigin, withOrigin]);
        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('compiler');
    });

    it('collected has same precedence as user', () => {
        const metrics = [
            frag(MetricType.Rep, 'runtime', 5),
            frag(MetricType.Rep, 'collected', 8),
        ];
        const result = selectBestTier(metrics);
        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('collected');
    });

    it('returns empty array for empty input', () => {
        expect(selectBestTier([])).toEqual([]);
    });
});

describe('resolveMetricPrecedence', () => {
    it('resolves per-type independently', () => {
        const metrics = [
            frag(MetricType.Duration, 'runtime', 'elapsed'),
            frag(MetricType.Duration, 'parser', 'planned'),
            frag(MetricType.Action, 'parser', 'Thrusters'),
        ];
        const result = resolveMetricPrecedence(metrics);

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
        const result = resolveMetricPrecedence(metrics);
        expect(result).toHaveLength(3);
    });

    it('filters by origin', () => {
        const metrics = [
            frag(MetricType.Duration, 'runtime', 'live'),
            frag(MetricType.Duration, 'parser', 'plan'),
            frag(MetricType.Rep, 'parser', 10),
        ];
        const result = resolveMetricPrecedence(metrics, { origins: ['parser'] });
        expect(result).toHaveLength(2);
        expect(result.every(f => f.origin === 'parser')).toBe(true);
    });

    it('filters by type', () => {
        const metrics = [
            frag(MetricType.Duration, 'parser', 300),
            frag(MetricType.Rep, 'parser', 21),
            frag(MetricType.Action, 'parser', 'Burpees'),
        ];
        const result = resolveMetricPrecedence(metrics, {
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
        const result = resolveMetricPrecedence(metrics, {
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
        const result = resolveMetricPrecedence(metrics, {
            excludeTypes: [MetricType.Action],
        });
        expect(result).toHaveLength(2);

        const timer = result.find(f => f.type === MetricType.Duration);
        expect(timer?.origin).toBe('runtime');

        const rep = result.find(f => f.type === MetricType.Rep);
        expect(rep?.origin).toBe('compiler');
    });

    it('handles empty input', () => {
        expect(resolveMetricPrecedence([])).toEqual([]);
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
        const result = resolveMetricPrecedence(metrics);

        const reps = result.filter(f => f.type === MetricType.Rep);
        expect(reps).toHaveLength(3);
        expect(reps.map(f => f.value)).toEqual([21, 15, 9]);

        const actions = result.filter(f => f.type === MetricType.Action);
        expect(actions).toHaveLength(2);
    });

    it('tracked and analyzed map to runtime tier', () => {
        const metrics = [
            frag(MetricType.Distance, 'parser', 5000),
            frag(MetricType.Distance, 'tracked', 3200),
        ];
        const result = resolveMetricPrecedence(metrics);
        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('tracked');
    });
});
